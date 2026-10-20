using System.Net.Mail;
using System.Text.RegularExpressions;
namespace UPMS.Server.Inquiries;

public static partial class InquiryValidation
{
    public static readonly IReadOnlyDictionary<string, string> Categories = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["buckets"] = "Plastic Buckets", ["cans"] = "Lubricant Cans", ["jars"] = "Plastic Jars",
        ["containers"] = "Industrial Containers", ["custom"] = "Custom Packaging"
    };
    public static bool IsEmail(string value) => value.Length <= 254 && !value.Any(char.IsControl)
        && MailAddress.TryCreate(value, out var address) && address.Address == value && string.IsNullOrEmpty(address.DisplayName)
        && value.Contains('@') && !value.Any(char.IsWhiteSpace);

    public static Dictionary<string, string[]> Validate(InquiryRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        void Field(string key, string value, int min, int max, bool multiline = false)
        {
            if (value.Length < min) errors[key] = ["Please complete this field."];
            else if (value.Length > max) errors[key] = [$"Use no more than {max} characters."];
            else if (value.Any(c => char.IsControl(c) && !(multiline && c is '\r' or '\n' or '\t')))
                errors[key] = ["Remove unsupported control characters."];
        }
        Field("customerName", request.CustomerName, 1, 100);
        Field("companyName", request.CompanyName, 0, 150);
        Field("email", request.Email, 1, 254);
        Field("phone", request.Phone, 1, 40);
        Field("productCategory", request.ProductCategory, 1, 30);
        Field("quantity", request.Quantity, 0, 80);
        Field("capacity", request.Capacity, 0, 80);
        Field("message", request.Message, 10, 4000, true);
        if (!errors.ContainsKey("email") && !IsEmail(request.Email)) errors["email"] = ["Enter a valid email address."];
        if (!errors.ContainsKey("phone") && (!PhoneCharacters().IsMatch(request.Phone) || request.Phone.Count(char.IsAsciiDigit) is < 7 or > 20))
            errors["phone"] = ["Enter a phone number with 7–20 digits; spaces, +, -, dots and parentheses are allowed."];
        if (!Categories.ContainsKey(request.ProductCategory)) errors["productCategory"] = ["Choose a listed product category."];
        if (request.Message.Length is > 0 and < 10) errors["message"] = ["Include at least 10 characters about your packaging requirements."];
        return errors;
    }
    [GeneratedRegex(@"^[0-9+().\-\s]+$")]
    private static partial Regex PhoneCharacters();
}
