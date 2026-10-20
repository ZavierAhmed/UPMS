using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Options;
namespace UPMS.Server.Inquiries;

public static class InquiryApi
{
    public const string Path = "/api/v1/public/inquiries";
    public static string Correlation(HttpContext context) => (string)context.Items["InquiryCorrelation"]!;
    public static IResult Error(HttpContext c, int status, string code, string message, Dictionary<string,string[]>? errors = null)
        => Results.Json(new InquiryError(code, message, Correlation(c), errors), statusCode: status);

    public static void AddInquiryServices(this WebApplicationBuilder builder)
    {
        builder.Services.Configure<InquiryOptions>(builder.Configuration.GetSection("Inquiries"));
        builder.Services.AddSingleton<IInquiryDelivery, ConfiguredInquiryDelivery>();
        builder.Services.AddSingleton<InquirySubmissionService>();
        builder.Services.AddRateLimiter(config =>
        {
            config.AddPolicy("inquiries", context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = Math.Clamp(context.RequestServices.GetRequiredService<IOptions<InquiryOptions>>().Value.RateLimit, 1, 100),
                    Window = TimeSpan.FromMinutes(10), QueueLimit = 0, AutoReplenishment = true
                }));
            config.OnRejected = async (rejection, token) =>
            {
                var retry = rejection.Lease.TryGetMetadata(MetadataName.RetryAfter, out var after) ? (int)Math.Ceiling(after.TotalSeconds) : 600;
                rejection.HttpContext.Response.Headers.RetryAfter = retry.ToString(System.Globalization.CultureInfo.InvariantCulture);
                await Error(rejection.HttpContext, 429, "rate_limited", "Too many attempts. Please wait before trying again, or contact us by phone or email.").ExecuteAsync(rejection.HttpContext);
            };
        });
    }
    public static void UseInquiryBoundary(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            if (!context.Request.Path.StartsWithSegments("/api")) { await next(); return; }
            var correlation = Guid.NewGuid().ToString("N");
            context.Items["InquiryCorrelation"] = correlation;
            context.Response.Headers["X-Correlation-ID"] = correlation;
            context.Response.Headers.CacheControl = "no-store";
            context.Response.Headers.XContentTypeOptions = "nosniff";
            try
            {
                if (string.Equals(context.Request.Path.Value?.TrimEnd('/'), Path, StringComparison.OrdinalIgnoreCase)
                    && HttpMethods.IsPost(context.Request.Method))
                {
                    var configured = context.RequestServices.GetRequiredService<IOptions<InquiryOptions>>().Value.PublicOrigin;
                    var expected = string.IsNullOrEmpty(configured) ? $"{context.Request.Scheme}://{context.Request.Host}" : configured;
                    var origin = context.Request.Headers.Origin.ToString();
                    if (context.Request.Headers["Sec-Fetch-Site"] == "cross-site" ||
                        (!string.IsNullOrEmpty(origin) && (!Uri.TryCreate(origin, UriKind.Absolute, out var originUri) ||
                         !Uri.TryCreate(expected, UriKind.Absolute, out var expectedUri) ||
                         originUri.GetLeftPart(UriPartial.Authority) != expectedUri.GetLeftPart(UriPartial.Authority))))
                    { await Error(context, 403, "origin_not_allowed", "This request must be sent from our website.").ExecuteAsync(context); return; }
                    if (context.Request.ContentType?.Split(';')[0].Trim() != "application/json" || context.Request.Headers.ContentEncoding.Count > 0)
                    { await Error(context, 415, "unsupported_content", "Send the inquiry as JSON without content encoding.").ExecuteAsync(context); return; }
                    if (context.Request.ContentLength > 16384)
                    { await Error(context, 413, "request_too_large", "Your inquiry is too large. Please shorten the message.").ExecuteAsync(context); return; }
                    var feature = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
                    if (feature is { IsReadOnly: false }) feature.MaxRequestBodySize = 16384;
                }
                await next();
            }
            catch (BadHttpRequestException ex)
            { await Error(context, ex.StatusCode == 413 ? 413 : 400, "invalid_request", "The request could not be read. Please check the form and try again.").ExecuteAsync(context); }
            catch (Exception)
            {
                app.Logger.LogWarning("Inquiry API request failed; correlation {CorrelationId}", correlation);
                if (!context.Response.HasStarted) await Error(context, 500, "request_failed", "We could not process the request. Please contact us by phone or email.").ExecuteAsync(context);
            }
        });
    }
    public static void MapInquiryApi(this WebApplication app)
    {
        app.MapPost(Path, async (HttpContext context, InquirySubmissionService service) =>
        {
            if (!Guid.TryParseExact(context.Request.Headers["Idempotency-Key"].ToString(), "D", out var key) || key == Guid.Empty)
                return Error(context, 400, "invalid_idempotency_key", "A valid request key is required. Reload the page and try again.");
            // Read at most 16 KiB even for a chunked request or a server without the body-size feature.
            using var body = new MemoryStream();
            var buffer = new byte[4096];
            int count;
            while ((count = await context.Request.Body.ReadAsync(buffer, context.RequestAborted)) != 0)
            {
                if (body.Length + count > 16384) return Error(context, 413, "request_too_large", "Your inquiry is too large. Please shorten the message.");
                await body.WriteAsync(buffer.AsMemory(0, count));
            }
            InquiryRequest? request;
            try { request = JsonSerializer.Deserialize<InquiryRequest>(body.ToArray(), new JsonSerializerOptions(JsonSerializerDefaults.Web) { MaxDepth = 8 }); }
            catch (JsonException) { return Error(context, 400, "invalid_json", "The inquiry could not be read. Please check the form and try again."); }
            if (request is null) return Error(context, 400, "invalid_json", "An inquiry is required.");
            request = request.Normalize();
            if (!string.IsNullOrEmpty(request.Website)) return Error(context, 400, "invalid_submission", "This inquiry could not be accepted. Please contact us directly.");
            var errors = InquiryValidation.Validate(request);
            if (errors.Count > 0) return Error(context, 400, "validation_failed", "Please check the highlighted fields.", errors);
            var task = service.Submit(key, request, out var submissionError);
            if (task is null) return Error(context, submissionError == "busy" ? 503 : 409, submissionError!,
                submissionError == "busy" ? "Our inquiry service is busy. Please contact us directly or try later." : "This request key was used for different details. Please contact us if delivery is uncertain.");
            var result = await task;
            app.Logger.LogInformation("Inquiry {Reference}; correlation {CorrelationId}", result.Reference, Correlation(context));
            return result.Outcome switch
            {
                DeliveryOutcome.SmtpAccepted => Results.Ok(new InquiryResponse("smtp_accepted", "Your inquiry was accepted by our mail server for delivery to our team. Inbox receipt is not yet confirmed.", result.Reference, Correlation(context))),
                DeliveryOutcome.DevelopmentSaved => Results.Ok(new InquiryResponse("development_saved", "Development only: your inquiry was saved to the local outbox. No email was sent.", result.Reference, Correlation(context))),
                DeliveryOutcome.Unavailable => Error(context, 503, "delivery_unavailable", "Online inquiries are currently unavailable. Your inquiry has not been sent. Please call or email us."),
                DeliveryOutcome.Rejected => Error(context, 502, "delivery_rejected", "The mail service did not accept your inquiry. Please call or email us, or try again later."),
                _ => Error(context, 503, "delivery_unknown", $"Delivery could not be confirmed. Please contact us by phone or email with reference {result.Reference} before submitting again.")
            };
        }).RequireRateLimiting("inquiries");
        // Never return the public SPA shell for unknown API paths or methods.
        app.Map("/api/{**path}", (HttpContext c) => Error(c, 404, "not_found", "This API endpoint is not available."));
    }
}
