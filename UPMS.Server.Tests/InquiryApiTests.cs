using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using UPMS.Server.Inquiries;

namespace UPMS.Server.Tests;

public sealed class InquiryApiTests
{
    private const string Endpoint = InquiryApi.Path;
    private static InquiryRequest Valid => new() { CustomerName = "Test Buyer", CompanyName = "Example Test Company", Email = "buyer@example.test", Phone = "+92 300 1234567", ProductCategory = "buckets", Message = "Automated packaging inquiry for local testing only.", Quantity = "500", Capacity = "20L" };
    private static HttpRequestMessage Request(InquiryRequest? body = null, Guid? key = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, Endpoint) { Content = JsonContent.Create(body ?? Valid) };
        request.Headers.Add("Idempotency-Key", (key ?? Guid.NewGuid()).ToString());
        return request;
    }
    [Fact]
    public async Task Successful_test_delivery_is_explicit_and_correlated()
    {
        await using var app = new TestApp(); using var client = app.Client();
        var response = await client.SendAsync(Request());
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<InquiryResponse>();
        Assert.Equal("development_saved", result!.Status);
        Assert.Contains("No email", result.Message);
        Assert.Equal(result.CorrelationId, response.Headers.GetValues("X-Correlation-ID").Single());
        Assert.Equal(1, app.Fake.Count);
    }
    [Fact]
    public async Task Required_fields_are_reported_and_nothing_is_delivered()
    {
        await using var app = new TestApp(); using var client = app.Client();
        var response = await client.SendAsync(Request(new InquiryRequest()));
        var error = await response.Content.ReadFromJsonAsync<InquiryError>();
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("validation_failed", error!.Code);
        foreach (var field in new[] { "customerName", "email", "phone", "productCategory", "message" }) Assert.Contains(field, error.Errors!.Keys);
        Assert.Equal(0, app.Fake.Count);
    }
    [Theory]
    [InlineData("email", "not-an-email")]
    [InlineData("email", "Name <person@example.test>")]
    [InlineData("email", "a@example.test\r\nBcc: hidden@example.test")]
    [InlineData("customerName", "Buyer\r\nInjected")]
    [InlineData("phone", "abc123")]
    [InlineData("productCategory", "unknown")]
    [InlineData("productCategory", "Buckets")]
    [InlineData("message", "short")]
    public async Task Invalid_inputs_are_rejected(string field, string value)
    {
        var body = field switch { "email" => Valid with { Email = value }, "phone" => Valid with { Phone = value }, "productCategory" => Valid with { ProductCategory = value }, "message" => Valid with { Message = value }, _ => Valid with { CustomerName = value } };
        await using var app = new TestApp(); using var client = app.Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(Request(body))).StatusCode);
        Assert.Equal(0, app.Fake.Count);
    }
    [Theory]
    [InlineData("buckets")]
    [InlineData("cans")]
    [InlineData("jars")]
    [InlineData("containers")]
    [InlineData("custom")]
    public async Task Only_listed_categories_are_accepted(string category)
    {
        await using var app = new TestApp(); using var client = app.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(Request(Valid with { ProductCategory = category }))).StatusCode);
    }
    [Fact]
    public async Task Length_limits_and_honeypot_prevent_delivery()
    {
        await using var app = new TestApp(); using var client = app.Client();
        foreach (var body in new[] { Valid with { CustomerName = new string('x', 101) }, Valid with { CompanyName = new string('x', 151) }, Valid with { Quantity = new string('x', 81) }, Valid with { Capacity = new string('x', 81) }, Valid with { Message = new string('x', 4001) }, Valid with { Website = "spam.example" } })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(Request(body))).StatusCode);
        Assert.Equal(0, app.Fake.Count);
    }
    [Fact]
    public async Task Duplicate_concurrent_requests_share_one_delivery_and_reference()
    {
        await using var app = new TestApp(); app.Fake.Delay = TimeSpan.FromMilliseconds(150); using var client = app.Client();
        var key = Guid.NewGuid();
        var responses = await Task.WhenAll(client.SendAsync(Request(key: key)), client.SendAsync(Request(key: key)));
        var first = await responses[0].Content.ReadFromJsonAsync<InquiryResponse>();
        var second = await responses[1].Content.ReadFromJsonAsync<InquiryResponse>();
        Assert.Equal(first!.Reference, second!.Reference); Assert.Equal(1, app.Fake.Count);
        Assert.Equal(HttpStatusCode.Conflict, (await client.SendAsync(Request(Valid with { Message = "Different requirements after first submission." }, key))).StatusCode);
        Assert.Equal(1, app.Fake.Count);
    }
    [Theory]
    [InlineData(DeliveryOutcome.Unavailable, 503, "delivery_unavailable")]
    [InlineData(DeliveryOutcome.Rejected, 502, "delivery_rejected")]
    [InlineData(DeliveryOutcome.Unknown, 503, "delivery_unknown")]
    public async Task Delivery_failures_are_honest_and_safe(DeliveryOutcome outcome, int status, string code)
    {
        await using var app = new TestApp(); app.Fake.Outcome = outcome; using var client = app.Client();
        var response = await client.SendAsync(Request());
        Assert.Equal(status, (int)response.StatusCode);
        Assert.Equal(code, (await response.Content.ReadFromJsonAsync<InquiryError>())!.Code);
        Assert.DoesNotContain("stack", await response.Content.ReadAsStringAsync());
    }
    [Fact]
    public async Task Thrown_exceptions_are_not_disclosed_or_logged_with_customer_data()
    {
        await using var app = new TestApp(); app.Fake.Throws = true; using var client = app.Client();
        var response = await client.SendAsync(Request()); var body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.DoesNotContain("private-infrastructure", body);
        Assert.Contains(app.Logs.Messages, message => message.Contains("Inquiry handoff"));
        foreach (var sensitive in new[] { Valid.Email, Valid.Phone, Valid.Message, "private-infrastructure" }) Assert.DoesNotContain(sensitive, string.Join("\n", app.Logs.Messages));
    }
    [Fact]
    public async Task Server_timeout_is_bounded_and_cached_as_uncertain()
    {
        await using var app = new TestApp(timeout: 1); app.Fake.Delay = TimeSpan.FromSeconds(10); using var client = app.Client();
        var key = Guid.NewGuid(); var response = await client.SendAsync(Request(key: key));
        Assert.Equal("delivery_unknown", (await response.Content.ReadFromJsonAsync<InquiryError>())!.Code);
        await client.SendAsync(Request(key: key)); Assert.Equal(1, app.Fake.Count);
    }
    [Fact]
    public async Task Rate_limit_returns_json_and_retry_after_without_delivering_again()
    {
        await using var app = new TestApp(rate: 2); using var client = app.Client();
        await client.SendAsync(Request()); await client.SendAsync(Request()); var response = await client.SendAsync(Request());
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.NotNull(response.Headers.RetryAfter);
        Assert.Equal("rate_limited", (await response.Content.ReadFromJsonAsync<InquiryError>())!.Code);
        Assert.Equal(2, app.Fake.Count);
    }
    [Fact]
    public async Task Cross_origin_and_cross_site_requests_are_rejected_without_cors()
    {
        await using var app = new TestApp(); using var client = app.Client();
        using var cross = Request(); cross.Headers.Add("Origin", "https://other.example"); var response = await client.SendAsync(cross);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode); Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
        using var site = Request(); site.Headers.Add("Sec-Fetch-Site", "cross-site"); Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(site)).StatusCode);
        using var same = Request(); same.Headers.Add("Origin", "https://localhost"); Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(same)).StatusCode);
    }
    [Theory]
    [InlineData("/api/v1/public/inquiries/")]
    [InlineData("/API/v1/public/inquiries")]
    public async Task Alternate_route_spelling_cannot_bypass_origin_checks(string path)
    {
        await using var app = new TestApp(); using var client = app.Client();
        using var request = Request(); request.RequestUri = new Uri(path, UriKind.Relative);
        request.Headers.Add("Origin", "https://other.example");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(request)).StatusCode);
        Assert.Equal(0, app.Fake.Count);
    }
    [Fact]
    public async Task Smtp_acceptance_does_not_claim_inbox_receipt()
    {
        await using var app = new TestApp(); app.Fake.Outcome = DeliveryOutcome.SmtpAccepted;
        using var client = app.Client(); var response = await client.SendAsync(Request());
        var result = await response.Content.ReadFromJsonAsync<InquiryResponse>();
        Assert.Equal("smtp_accepted", result!.Status);
        Assert.Contains("Inbox receipt is not yet confirmed", result.Message);
    }
    [Fact]
    public async Task Invalid_json_media_type_and_request_keys_have_structured_errors()
    {
        await using var app = new TestApp(); using var client = app.Client();
        using var missing = Request(); missing.Headers.Remove("Idempotency-Key"); Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(missing)).StatusCode);
        using var media = Request(); media.Content = new StringContent("anything"); Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await client.SendAsync(media)).StatusCode);
        using var malformed = Request(); malformed.Content = new StringContent("{broken", Encoding.UTF8, "application/json"); var response = await client.SendAsync(malformed);
        Assert.Equal("invalid_json", (await response.Content.ReadFromJsonAsync<InquiryError>())!.Code);
        using var encoded = Request(); encoded.Content!.Headers.Add("Content-Encoding", "gzip"); Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await client.SendAsync(encoded)).StatusCode);
        Assert.Equal(0, app.Fake.Count);
    }
    [Fact]
    public async Task Both_declared_and_chunked_oversized_bodies_are_rejected()
    {
        await using var app = new TestApp(); using var client = app.Client();
        using var declared = Request(Valid with { Message = new string('x', 17000) }); Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await client.SendAsync(declared)).StatusCode);
        using var chunked = Request(); chunked.Content = new ChunkedContent(new string('x', 17000)); chunked.Content.Headers.ContentType = new("application/json"); Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await client.SendAsync(chunked)).StatusCode);
        Assert.Equal(0, app.Fake.Count);
    }
    [Fact]
    public async Task Unknown_api_routes_never_return_the_spa()
    {
        await using var app = new TestApp(); using var client = app.Client();
        var response = await client.GetAsync("/api/missing"); Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await response.Content.ReadFromJsonAsync<InquiryError>())!.Code);
        Assert.Equal("no-store", response.Headers.CacheControl!.ToString());
    }
    [Theory]
    [InlineData("Disabled")]
    [InlineData("DevelopmentFile")]
    [InlineData("Smtp")]
    public async Task Production_without_valid_smtp_never_reports_success(string mode)
    {
        await using var app = new TestApp(real: true, environment: "Production", mode: mode); using var client = app.Client();
        var response = await client.SendAsync(Request()); Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("delivery_unavailable", (await response.Content.ReadFromJsonAsync<InquiryError>())!.Code);
    }
    [Fact]
    public void Notification_is_plain_text_with_fixed_subject_and_validated_reply_to()
    {
        using var message = ConfiguredInquiryDelivery.BuildMessage(Valid with { Message = "<script>alert('test')</script>" }, "test-reference", new SmtpOptions { From = "sender@example.test", Recipient = "inbox@example.test" });
        Assert.Null(message.HtmlBody); Assert.Contains("<script>", message.TextBody);
        Assert.Equal("Unique Plastic Industry packaging inquiry [test-reference]", message.Subject);
        Assert.Equal(Valid.Email, message.ReplyTo.Mailboxes.Single().Address);
        Assert.Single(message.To); Assert.Empty(message.Cc); Assert.Empty(message.Bcc);
    }
}
public sealed class TestApp(int rate = 100, int timeout = 15, bool real = false, string environment = "Testing", string mode = "Disabled") : WebApplicationFactory<Program>
{
    public FakeDelivery Fake { get; } = new(); public CaptureLogs Logs { get; } = new();
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        builder.ConfigureServices(services =>
        {
            services.PostConfigure<InquiryOptions>(options => { options.Mode = mode; options.RateLimit = rate; options.TimeoutSeconds = timeout; options.PublicOrigin = "https://localhost"; options.Smtp = new(); });
            if (!real) { services.RemoveAll<IInquiryDelivery>(); services.AddSingleton<IInquiryDelivery>(Fake); }
            services.AddLogging(config => { config.SetMinimumLevel(LogLevel.Warning); config.AddFilter<CaptureLogs>(null, LogLevel.Information); config.AddProvider(Logs); });
        });
    }
    public HttpClient Client() => CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false });
}
public sealed class FakeDelivery : IInquiryDelivery
{
    private int count; public int Count => count; public DeliveryOutcome Outcome { get; set; } = DeliveryOutcome.DevelopmentSaved;
    public TimeSpan Delay { get; set; }
    public bool Throws { get; set; }
    public async Task<DeliveryReceipt> DeliverAsync(InquiryRequest inquiry, string reference, CancellationToken token)
    { Interlocked.Increment(ref count); if (Delay > TimeSpan.Zero) await Task.Delay(Delay, token); if (Throws) throw new InvalidOperationException("private-infrastructure-secret"); return new(Outcome); }
}
public sealed class CaptureLogs : ILoggerProvider
{
    public System.Collections.Concurrent.ConcurrentBag<string> Messages { get; } = [];
    public ILogger CreateLogger(string categoryName) => new CaptureLogger(Messages); public void Dispose() { }
    private sealed class CaptureLogger(System.Collections.Concurrent.ConcurrentBag<string> messages) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null; public bool IsEnabled(LogLevel level) => true;
        public void Log<TState>(LogLevel level, EventId id, TState state, Exception? exception, Func<TState, Exception?, string> formatter) => messages.Add(formatter(state, exception));
    }
}
public sealed class ChunkedContent(string value) : HttpContent
{
    protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) => stream.WriteAsync(Encoding.UTF8.GetBytes(value)).AsTask();
    protected override bool TryComputeLength(out long length) { length = 0; return false; }
    public ChunkedContent() : this("") { }
    protected override void Dispose(bool disposing) => base.Dispose(disposing);
}
