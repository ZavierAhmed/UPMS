using System.IO.Compression;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using UPMS.Server.Website;

namespace UPMS.Server.Tests;

public sealed class WebsiteTests
{
    private const string Address = "Wali Road, Metroville, S.I.T.E., Karachi 75700, Pakistan";
    public static TheoryData<string> Routes => new() { "/", "/about", "/products", "/manufacturing", "/industries", "/contact", "/products/buckets", "/products/cans", "/products/jars", "/products/containers", "/products/custom" };

    [Theory, MemberData(nameof(Routes))]
    public async Task Public_responses_have_real_content_and_page_metadata(string path)
    {
        await using var app = new WebsiteApp(); using var client = app.Client();
        var site = app.Services.GetRequiredService<PublicWebsite>();
        var page = Assert.Single(site.Pages, p => p.Path == path);
        var response = await client.GetAsync(path); var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType!.MediaType);
        Assert.Contains($"<title>{WebUtility.HtmlEncode(page.Title)}</title>", html);
        Assert.Contains($"content=\"{WebUtility.HtmlEncode(page.Description)}\"", html);
        Assert.Single(Regex.Matches(html, "<h1[ >]"));
        Assert.Contains($"data-prerender-path=\"{path}\"", html);
        Assert.Contains(Address, html);
        Assert.Contains("https://wa.me/923142113472?text=", html);
        Assert.Contains("https://maps.app.goo.gl/KJGy7zo7cQhsFwsF6", html);
        Assert.Contains($"rel=\"canonical\" href=\"https://www.example.test{path}\"", html);
        Assert.Contains($"property=\"og:url\" content=\"https://www.example.test{path}\"", html);
        Assert.DoesNotContain("F-260", html); Assert.DoesNotContain("Z.A", html);
        Assert.DoesNotContain("<!--prerender-->", html); Assert.DoesNotContain("/src/", html);
        Assert.Equal("no-cache", response.Headers.CacheControl!.ToString());
    }

    [Theory]
    [InlineData("/missing")]
    [InlineData("/ABOUT")]
    [InlineData("/products/missing")]
    [InlineData("/products/buckets/extra")]
    public async Task Unknown_public_pages_return_an_html_404(string path)
    {
        await using var app = new WebsiteApp(); using var client = app.Client();
        var response = await client.GetAsync(path); var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("404 / PAGE NOT FOUND", html);
        Assert.Contains("noindex", response.Headers.GetValues("X-Robots-Tag").Single());
        Assert.DoesNotContain("rel=\"canonical\"", html);
    }

    [Theory]
    [InlineData("/assets/missing.js")]
    [InlineData("/assets/missing")]
    [InlineData("/index.html")]
    [InlineData("/public-routes.json")]
    [InlineData("/_pages/home.html")]
    [InlineData("/appsettings.json")]
    [InlineData("/management/orders")]
    [InlineData("/admin/users")]
    public async Task Files_and_reserved_paths_never_receive_public_html(string path)
    {
        await using var app = new WebsiteApp(); using var client = app.Client();
        var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.DoesNotContain("<html", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Assets_are_real_typed_immutable_and_compressible()
    {
        await using var app = new WebsiteApp(); using var client = app.Client();
        var home = await client.GetStringAsync("/");
        var script = Regex.Match(home, "<script[^>]+src=\"([^\"]+)\"").Groups[1].Value;
        Assert.StartsWith("/assets/", script);
        using var request = new HttpRequestMessage(HttpMethod.Get, script); request.Headers.Add("Accept-Encoding", "gzip");
        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("javascript", response.Content.Headers.ContentType!.MediaType);
        Assert.Contains("immutable", response.Headers.CacheControl!.ToString());
        Assert.Contains("gzip", response.Content.Headers.ContentEncoding);
        await using var compressed = new GZipStream(await response.Content.ReadAsStreamAsync(), CompressionMode.Decompress);
        using var reader = new StreamReader(compressed); Assert.NotEmpty(await reader.ReadToEndAsync());
        Assert.Contains("SIL OPEN FONT LICENSE", await client.GetStringAsync("/licenses/DM-Sans-OFL.txt"));
        Assert.Contains("SIL OPEN FONT LICENSE", await client.GetStringAsync("/licenses/Manrope-OFL.txt"));
        foreach (Match match in Regex.Matches(home, "(?:src|href)=\"(/assets/[^\"]+)\""))
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(match.Groups[1].Value)).StatusCode);
    }

    [Fact]
    public async Task Sitemap_and_robots_share_the_configured_origin_and_registry()
    {
        await using var app = new WebsiteApp(); using var client = app.Client();
        var site = app.Services.GetRequiredService<PublicWebsite>();
        var xml = XDocument.Parse(await client.GetStringAsync("/sitemap.xml"));
        var locations = xml.Descendants(XName.Get("loc", "http://www.sitemaps.org/schemas/sitemap/0.9")).Select(x => x.Value).ToArray();
        Assert.Equal(site.Pages.Select(p => "https://www.example.test" + p.Path).Order(), locations.Order());
        Assert.Equal(11, locations.Length); Assert.DoesNotContain(locations, p => p.Contains("api"));
        var robots = await client.GetStringAsync("/robots.txt");
        Assert.Contains("Sitemap: https://www.example.test/sitemap.xml", robots);
        Assert.Contains("Disallow: /management/", robots); Assert.Contains("Disallow: /api/", robots);
    }

    [Fact]
    public async Task Missing_launch_origin_never_uses_localhost_for_indexing()
    {
        await using var app = new WebsiteApp(origin: ""); using var client = app.Client();
        var response = await client.GetAsync("/"); var html = await response.Content.ReadAsStringAsync();
        Assert.Contains("noindex", response.Headers.GetValues("X-Robots-Tag").Single());
        Assert.DoesNotContain("rel=\"canonical\"", html); Assert.DoesNotContain("og:url", html);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/sitemap.xml")).StatusCode);
        Assert.Equal("User-agent: *\nDisallow: /\n", await client.GetStringAsync("/robots.txt"));
    }

    [Fact]
    public async Task Query_refresh_head_methods_and_future_routes_are_compatible()
    {
        await using var app = new WebsiteApp(); using var client = app.Client();
        var html = await client.GetStringAsync("/contact?category=cans");
        Assert.Contains("https://www.example.test/contact\"", html);
        Assert.Contains("<form", html); Assert.Contains("method=\"post\"", html);
        Assert.Contains("<fieldset disabled=\"\"", html);
        Assert.Contains("Online inquiry submission requires JavaScript", html);
        using var head = new HttpRequestMessage(HttpMethod.Head, "/products/buckets");
        var response = await client.SendAsync(head); Assert.Equal(HttpStatusCode.OK, response.StatusCode); Assert.Empty(await response.Content.ReadAsByteArrayAsync());
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/about/")).StatusCode);
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await client.PostAsync("/contact", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/management/test-only-route")).StatusCode);
    }

    [Fact]
    public async Task Security_headers_https_and_host_filtering_apply()
    {
        await using var app = new WebsiteApp(); using var client = app.Client();
        var response = await client.GetAsync("/");
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        var policy = response.Headers.GetValues("Content-Security-Policy").Single();
        Assert.Contains("script-src 'self'", policy); Assert.DoesNotContain("unsafe-inline", policy);
        var publicResponse = await client.GetAsync("https://www.example.test/");
        Assert.Contains("max-age=15552000", publicResponse.Headers.GetValues("Strict-Transport-Security").Single());
        using var http = new HttpRequestMessage(HttpMethod.Get, "http://localhost/assets/missing.js");
        Assert.Equal("https", (await client.SendAsync(http)).Headers.Location!.Scheme);
        using var hostile = new HttpRequestMessage(HttpMethod.Get, "/"); hostile.Headers.Host = "attacker.example";
        Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(hostile)).StatusCode);
    }

    [Fact]
    public async Task Api_errors_and_inquiry_validation_are_not_html_or_compressed()
    {
        await using var app = new WebsiteApp(); using var client = app.Client();
        var unknown = await client.GetAsync("/api/unknown"); Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal("not_found", JsonDocument.Parse(await unknown.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString());
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/public/inquiries") { Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json") };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString()); request.Headers.Add("Accept-Encoding", "gzip");
        var response = await client.SendAsync(request); Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(response.Content.Headers.ContentEncoding);
        Assert.Contains("validation_failed", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("http://www.example.test")]
    [InlineData("https://localhost")]
    [InlineData("https://127.0.0.1")]
    [InlineData("https://www.example.test/path")]
    [InlineData("https://www.example.test?x=1")]
    [InlineData("https://user:password@www.example.test")]
    [InlineData("https://www.example.test:8443")]
    public void Invalid_canonical_origins_are_rejected(string origin) => Assert.Throws<InvalidOperationException>(() => PublicWebsite.ValidateOrigin(origin));

    [Fact]
    public void Development_keeps_framework_https_port_discovery()
    {
        using var app = new WebsiteApp(origin: "", hosts: "localhost", environment: "Development");
        var options = app.Services.GetRequiredService<IOptions<Microsoft.AspNetCore.HttpsPolicy.HttpsRedirectionOptions>>().Value;
        Assert.Null(options.HttpsPort);
    }

    [Fact]
    public void Unsafe_production_configuration_fails_startup()
    {
        using var wildcard = new WebsiteApp(hosts: "*"); Assert.Throws<InvalidOperationException>(() => wildcard.Client());
        using var missingHost = new WebsiteApp(hosts: "localhost"); Assert.Throws<InvalidOperationException>(() => missingHost.Client());
        using var trustAll = new WebsiteApp(extra: new() { ["ForwardedHeaders_Enabled"] = "true" }); Assert.Throws<InvalidOperationException>(() => trustAll.Client());
    }

    [Theory]
    [InlineData("192.0.2.10", "https")]
    [InlineData("198.51.100.10", "http")]
    public async Task Only_exact_trusted_proxies_can_change_scheme_and_client_ip(string remote, string expected)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["ReverseProxy:KnownProxies:0"] = "192.0.2.10" }).Build();
        var options = ProductionHosting.ProxyOptions(configuration)!;
        var context = new DefaultHttpContext(); context.Connection.RemoteIpAddress = IPAddress.Parse(remote); context.Request.Scheme = "http";
        context.Request.Headers["X-Forwarded-For"] = "203.0.113.10"; context.Request.Headers["X-Forwarded-Proto"] = "https";
        context.Request.Headers["X-Forwarded-Host"] = "attacker.example";
        var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(options));
        await middleware.Invoke(context);
        Assert.Equal(expected, context.Request.Scheme);
        Assert.Equal(expected == "https" ? "203.0.113.10" : remote, context.Connection.RemoteIpAddress!.ToString());
        Assert.NotEqual("attacker.example", context.Request.Host.Host);
    }
}

public sealed class WebsiteApp(string origin = "https://www.example.test", string hosts = "localhost;www.example.test", Dictionary<string, string?>? extra = null, string environment = "Production") : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>(extra ?? [])
        { ["Website:PublicOrigin"] = origin, ["AllowedHosts"] = hosts }));
        builder.ConfigureServices(services => services.AddControllers().AddApplicationPart(typeof(FutureManagementTestController).Assembly));
    }
    public HttpClient Client() => CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false });
}
[ApiController]
public sealed class FutureManagementTestController : ControllerBase
{
    [HttpGet("/management/test-only-route")]
    public IActionResult TestRoute() => Ok();
}
