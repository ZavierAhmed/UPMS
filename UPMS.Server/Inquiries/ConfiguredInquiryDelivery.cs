using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
namespace UPMS.Server.Inquiries;

public sealed class ConfiguredInquiryDelivery(IOptions<InquiryOptions> options, IWebHostEnvironment environment) : IInquiryDelivery
{
    public async Task<DeliveryReceipt> DeliverAsync(InquiryRequest inquiry, string reference, CancellationToken cancellationToken)
    {
        var config = options.Value;
        if (config.Mode == "DevelopmentFile" && environment.IsDevelopment())
        {
            // This outbox is never served from wwwroot and never enabled in Production.
            var directory = Path.Combine(environment.ContentRootPath, ".local", "inquiry-outbox");
            Directory.CreateDirectory(directory);
            var temporary = Path.Combine(directory, reference + ".tmp");
            try
            {
                await using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None,
                    4096, FileOptions.Asynchronous | FileOptions.WriteThrough))
                {
                    var bytes = System.Text.Encoding.UTF8.GetBytes(BuildBody(inquiry, reference));
                    await stream.WriteAsync(bytes, cancellationToken);
                    await stream.FlushAsync(cancellationToken);
                    stream.Flush(flushToDisk: true);
                }
                File.Move(temporary, Path.Combine(directory, reference + ".txt"));
            }
            finally { if (File.Exists(temporary)) File.Delete(temporary); }
            return new(DeliveryOutcome.DevelopmentSaved);
        }
        var smtp = config.Smtp;
        if (config.Mode != "Smtp" || string.IsNullOrWhiteSpace(smtp.Host) || smtp.Host.Any(char.IsWhiteSpace)
            || smtp.Port is < 1 or > 65535 || smtp.TlsMode is not ("StartTls" or "SslOnConnect")
            || !InquiryValidation.IsEmail(smtp.From) || !InquiryValidation.IsEmail(smtp.Recipient)
            || string.IsNullOrWhiteSpace(smtp.Username) || string.IsNullOrWhiteSpace(smtp.Password))
            return new(DeliveryOutcome.Unavailable);

        using var message = BuildMessage(inquiry, reference, smtp);
        using var client = new SmtpClient(); // No protocol logger: SMTP traffic contains customer data.
        client.Timeout = Math.Clamp(config.TimeoutSeconds, 1, 30) * 1000;
        var sending = false;
        try
        {
            await client.ConnectAsync(smtp.Host, smtp.Port,
                smtp.TlsMode == "SslOnConnect" ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls, cancellationToken);
            await client.AuthenticateAsync(smtp.Username, smtp.Password, cancellationToken);
            sending = true;
            await client.SendAsync(message, cancellationToken);
            // Acceptance is already confirmed. A disconnect failure cannot undo it.
            try { await client.DisconnectAsync(true, cancellationToken); } catch { /* accepted by SMTP */ }
            return new(DeliveryOutcome.SmtpAccepted);
        }
        catch (SmtpCommandException) { return new(DeliveryOutcome.Rejected); }
        catch { return new(sending ? DeliveryOutcome.Unknown : DeliveryOutcome.Unavailable); }
    }
    public static MimeMessage BuildMessage(InquiryRequest inquiry, string reference, SmtpOptions smtp)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("Unique Plastic Industry", smtp.From));
        message.To.Add(new MailboxAddress("Unique Plastic Industry inquiries", smtp.Recipient));
        message.ReplyTo.Add(new MailboxAddress("", inquiry.Email));
        message.Subject = $"Unique Plastic Industry packaging inquiry [{reference}]";
        message.MessageId = MimeKit.Utils.MimeUtils.GenerateMessageId();
        message.Body = new TextPart("plain") { Text = BuildBody(inquiry, reference) };
        return message;
    }
    public static string BuildBody(InquiryRequest r, string reference) => $"""
        Unique Plastic Industry — packaging inquiry
        Reference: {reference}
        Customer: {r.CustomerName}
        Company: {r.CompanyName}
        Email: {r.Email}
        Phone: {r.Phone}
        Category: {InquiryValidation.Categories[r.ProductCategory]}
        Approximate quantity: {r.Quantity}
        Capacity / size: {r.Capacity}

        Customer's plain-text message:
        {r.Message}
        """;
}
