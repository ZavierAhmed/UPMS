using UPMS.Server.Inquiries;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.AddInquiryServices();
var app = builder.Build();
app.UseInquiryBoundary();
app.UseDefaultFiles();
app.MapStaticAssets();
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.UseHttpsRedirection();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();
app.MapInquiryApi();
app.MapFallbackToFile("/index.html");
app.Run();
public partial class Program { }
