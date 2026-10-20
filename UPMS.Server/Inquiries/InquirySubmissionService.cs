using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Options;
namespace UPMS.Server.Inquiries;

// Bounded, process-local retry protection, not a durable queue or an exactly-once guarantee.
public sealed class InquirySubmissionService(IInquiryDelivery delivery, IOptions<InquiryOptions> options,
    IHostApplicationLifetime lifetime, ILogger<InquirySubmissionService> logger)
{
    private sealed record Entry(string Fingerprint, DateTimeOffset Expires, Lazy<Task<Submission>> Work);
    public sealed record Submission(string Reference, DeliveryOutcome Outcome);
    private readonly Dictionary<Guid, Entry> entries = [];
    private readonly object gate = new();
    public Task<Submission>? Submit(Guid key, InquiryRequest request, out string? error)
    {
        var fingerprint = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(request)));
        lock (gate)
        {
            var now = DateTimeOffset.UtcNow;
            foreach (var expired in entries.Where(p => p.Value.Expires <= now && p.Value.Work.IsValueCreated && p.Value.Work.Value.IsCompleted).Select(p => p.Key).ToArray())
                entries.Remove(expired);
            if (entries.TryGetValue(key, out var existing))
            {
                error = existing.Fingerprint == fingerprint ? null : "idempotency_conflict";
                return error is null ? existing.Work.Value : null;
            }
            if (entries.Count >= 1000) { error = "busy"; return null; }
            var entry = new Entry(fingerprint, now.AddMinutes(30), new Lazy<Task<Submission>>(() => Deliver(request)));
            entries.Add(key, entry);
            error = null;
            return entry.Work.Value;
        }
    }
    private async Task<Submission> Deliver(InquiryRequest request)
    {
        var reference = Guid.NewGuid().ToString("N");
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(lifetime.ApplicationStopping);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(options.Value.TimeoutSeconds, 1, 30)));
        DeliveryOutcome outcome;
        try { outcome = (await delivery.DeliverAsync(request, reference, timeout.Token).WaitAsync(timeout.Token)).Outcome; }
        catch { outcome = DeliveryOutcome.Unknown; }
        // Never log the request, SMTP exceptions, contact details or message content.
        logger.LogInformation("Inquiry handoff {Outcome}; reference {Reference}", outcome, reference);
        return new(reference, outcome);
    }
}
