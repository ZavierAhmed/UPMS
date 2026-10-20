using UPMS.Server.Inquiries;
using UPMS.Server.Website;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.AddInquiryServices();
builder.AddProductionHosting();
var app = builder.Build();
app.UseProductionHosting();
app.UseInquiryBoundary();
var website = app.Services.GetRequiredService<PublicWebsite>();
app.UseWhen(context => context.Request.Path.StartsWithSegments("/assets") || context.Request.Path.StartsWithSegments("/licenses") || context.Request.Path == "/icons.svg" || context.Request.Path == "/favicon.svg",
    branch => branch.UseStaticFiles(website.AssetOptions()));
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();
app.MapInquiryApi();
app.MapGet("/robots.txt", (HttpContext context) => { context.Response.Headers.CacheControl = "no-cache"; return website.Robots(); });
app.MapGet("/sitemap.xml", (HttpContext context) => { context.Response.Headers.CacheControl = "no-cache"; return website.Sitemap(); });
app.MapFallback("/{**path}", website.Handle);
app.Run();
public partial class Program { }
