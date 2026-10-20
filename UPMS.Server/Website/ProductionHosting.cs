using System.IO.Compression;
using System.Net;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;

namespace UPMS.Server.Website;

public static class ProductionHosting
{
    public static void AddProductionHosting(this WebApplicationBuilder builder)
    {
        builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);
        builder.Services.AddSingleton<PublicWebsite>();
        builder.Services.AddHttpsRedirection(options => options.HttpsPort = builder.Configuration.GetValue<int?>("HTTPS_PORT") ?? (builder.Environment.IsDevelopment() ? null : 443));
        builder.Services.AddHsts(options => { options.MaxAge = TimeSpan.FromDays(180); options.IncludeSubDomains = false; options.Preload = false; });
        builder.Services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
            options.Providers.Add<BrotliCompressionProvider>();
            options.Providers.Add<GzipCompressionProvider>();
        });
        builder.Services.Configure<BrotliCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);
        builder.Services.Configure<GzipCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);
    }

    private static void ValidateConfiguration(IConfiguration configuration, IWebHostEnvironment environment)
    {
        if (configuration.GetValue<bool>("ForwardedHeaders_Enabled"))
            throw new InvalidOperationException("Do not use the trust-all forwarded-headers shortcut. Configure ReverseProxy:KnownProxies explicitly.");
        var origin = PublicWebsite.ValidateOrigin(configuration["Website:PublicOrigin"]);
        var hosts = (configuration["AllowedHosts"] ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (!environment.IsDevelopment() && (hosts.Length == 0 || hosts.Any(host => host.Contains('*'))))
            throw new InvalidOperationException("Production AllowedHosts must list explicit hostnames.");
        if (origin is not null && !hosts.Contains(new Uri(origin).Host, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException("AllowedHosts must include the Website:PublicOrigin hostname.");
    }

    public static ForwardedHeadersOptions? ProxyOptions(IConfiguration configuration)
    {
        var proxies = configuration.GetSection("ReverseProxy:KnownProxies").Get<string[]>() ?? [];
        if (proxies.Length == 0) return null;
        var options = new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
            ForwardLimit = 1
        };
        options.KnownProxies.Clear();
        options.KnownIPNetworks.Clear();
        foreach (var proxy in proxies)
        {
            if (!IPAddress.TryParse(proxy, out var ip)) throw new InvalidOperationException("ReverseProxy:KnownProxies must contain exact IP addresses.");
            options.KnownProxies.Add(ip);
            if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork) options.KnownProxies.Add(ip.MapToIPv6());
        }
        return options;
    }

    public static void UseProductionHosting(this WebApplication app)
    {
        ValidateConfiguration(app.Configuration, app.Environment);
        var proxies = ProxyOptions(app.Configuration);
        if (proxies is not null) app.UseForwardedHeaders(proxies);
        if (!app.Environment.IsDevelopment())
        {
            app.UseExceptionHandler(handler => handler.Run(async context =>
            {
                context.Response.StatusCode = 500;
                context.Response.ContentType = "text/plain";
                await context.Response.WriteAsync("The request could not be completed.");
            }));
            app.UseHsts();
        }
        app.Use(async (context, next) =>
        {
            context.Response.Headers.XContentTypeOptions = "nosniff";
            context.Response.Headers.XFrameOptions = "DENY";
            context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            if (!app.Environment.IsDevelopment())
                context.Response.Headers.ContentSecurityPolicy = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
            await next();
        });
        app.UseHttpsRedirection();
        // Do not compress API responses containing customer inquiry information.
        app.UseWhen(context => !context.Request.Path.StartsWithSegments("/api"), branch => branch.UseResponseCompression());
    }
}
