namespace UPMS.Server.Inquiries;

public sealed record InquiryRequest
{
    public string CustomerName { get; init; } = "";
    public string CompanyName { get; init; } = "";
    public string Email { get; init; } = "";
    public string Phone { get; init; } = "";
    public string ProductCategory { get; init; } = "";
    public string Quantity { get; init; } = "";
    public string Capacity { get; init; } = "";
    public string Message { get; init; } = "";
    public string Website { get; init; } = "";

    public InquiryRequest Normalize() => this with
    {
        CustomerName = CustomerName?.Trim() ?? "", CompanyName = CompanyName?.Trim() ?? "",
        Email = Email?.Trim() ?? "", Phone = Phone?.Trim() ?? "", ProductCategory = ProductCategory?.Trim() ?? "",
        Quantity = Quantity?.Trim() ?? "", Capacity = Capacity?.Trim() ?? "", Message = Message?.Trim() ?? "",
        Website = Website?.Trim() ?? ""
    };
}
public sealed record InquiryResponse(string Status, string Message, string Reference, string CorrelationId);
public sealed record InquiryError(string Code, string Message, string CorrelationId, Dictionary<string, string[]>? Errors = null);
public enum DeliveryOutcome { SmtpAccepted, DevelopmentSaved, Unavailable, Rejected, Unknown }
public sealed record DeliveryReceipt(DeliveryOutcome Outcome);
public interface IInquiryDelivery
{
    Task<DeliveryReceipt> DeliverAsync(InquiryRequest inquiry, string reference, CancellationToken cancellationToken);
}
public sealed class InquiryOptions
{
    public string Mode { get; set; } = "Disabled";
    public int TimeoutSeconds { get; set; } = 15;
    public int RateLimit { get; set; } = 5;
    public string PublicOrigin { get; set; } = "";
    public SmtpOptions Smtp { get; set; } = new();
}
public sealed class SmtpOptions
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public string TlsMode { get; set; } = "StartTls";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string From { get; set; } = "";
    public string Recipient { get; set; } = "";
}
