using System.Net;
using System.Text.Json;
using System.Xml.Linq;
using Microsoft.Extensions.FileProviders;

namespace UPMS.Server.Website;

public sealed record PublicPage(string Path, string File, string Title, string Description);
public sealed record PublicManifest(PublicPage[] Pages, string NotFoundFile);

public sealed class PublicWebsite
{
    public string Root { get; }
    public string? Origin { get; }
    public PublicPage[] Pages { get; }
    private readonly Dictionary<string, string> documents;
    private readonly string notFound;

    public PublicWebsite(IWebHostEnvironment environment, IConfiguration configuration)
    {
        Origin = ValidateOrigin(configuration["Website:PublicOrigin"]);
        var candidates = new[] { environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), Path.GetFullPath(Path.Combine(environment.ContentRootPath, "../upms.client/dist")) };
        Root = candidates.FirstOrDefault(path => File.Exists(Path.Combine(path, "public-routes.json")))
            ?? throw new InvalidOperationException("Public site build is missing. Run npm run build in upms.client before building/testing/publishing.");
        var manifest = JsonSerializer.Deserialize<PublicManifest>(File.ReadAllText(Path.Combine(Root, "public-routes.json")), new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new InvalidOperationException("Public route manifest is invalid.");
        Pages = manifest.Pages;
        if (Pages.Length == 0 || Pages.Select(p => p.Path).Distinct(StringComparer.Ordinal).Count() != Pages.Length)
            throw new InvalidOperationException("Public route manifest is empty or duplicated.");
        documents = Pages.ToDictionary(page => page.Path, page => ReadPage(page.File), StringComparer.Ordinal);
        notFound = ReadPage(manifest.NotFoundFile);
    }

    private string ReadPage(string file)
    {
        var path = Path.GetFullPath(Path.Combine(Root, file));
        if (!path.StartsWith(Root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) || !file.StartsWith("_pages/", StringComparison.Ordinal))
            throw new InvalidOperationException("Invalid public page file.");
        return File.ReadAllText(path);
    }

    public static string? ValidateOrigin(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != "https" || !uri.IsDefaultPort ||
            uri.AbsolutePath != "/" || uri.Query.Length != 0 || uri.Fragment.Length != 0 || uri.UserInfo.Length != 0 ||
            uri.IsLoopback || Uri.CheckHostName(uri.Host) != UriHostNameType.Dns || !uri.Host.Contains('.') ||
            uri.Host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase) || uri.Host.EndsWith(".local", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Website:PublicOrigin must be an absolute public HTTPS origin without credentials, path, query or fragment.");
        return uri.GetLeftPart(UriPartial.Authority);
    }

    public async Task Handle(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "/";
        if (path.Length > 1) path = path.EndsWith('/') ? path[..^1] : path;
        // This handler has fallback precedence: future controllers/endpoints win.
        // Reserved management/API and file paths must never receive public HTML.
        if (context.Request.Path.StartsWithSegments("/management") || context.Request.Path.StartsWithSegments("/admin") ||
            context.Request.Path.StartsWithSegments("/api") || path.Contains('.') || context.Request.Path.StartsWithSegments("/assets") ||
            context.Request.Path.StartsWithSegments("/licenses") || context.Request.Path.StartsWithSegments("/_pages"))
        { context.Response.StatusCode = 404; return; }
        if (!HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method))
        { context.Response.StatusCode = documents.ContainsKey(path) ? 405 : 404; if (context.Response.StatusCode == 405) context.Response.Headers.Allow = "GET, HEAD"; return; }
        var found = documents.TryGetValue(path, out var html);
        context.Response.StatusCode = found ? 200 : 404;
        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.Headers.CacheControl = "no-cache";
        if (!found || Origin is null) context.Response.Headers["X-Robots-Tag"] = "noindex, follow";
        html ??= notFound;
        var links = Origin is null ? "<meta name=\"site-indexing\" content=\"disabled\" />" : $"<meta name=\"site-origin\" content=\"{WebUtility.HtmlEncode(Origin)}\" />";
        if (found && Origin is not null)
        {
            var url = WebUtility.HtmlEncode(Origin + path);
            links += $"<link rel=\"canonical\" href=\"{url}\" /><meta property=\"og:url\" content=\"{url}\" />";
        }
        html = html.Replace("<!--site-url-->", links);
        if (Origin is null) html = html.Replace("content=\"index,follow\"", "content=\"noindex,follow\"");
        if (!HttpMethods.IsHead(context.Request.Method)) await context.Response.WriteAsync(html);
    }

    public IResult Robots()
    {
        var text = Origin is null ? "User-agent: *\nDisallow: /\n" : $"User-agent: *\nDisallow: /api/\nDisallow: /management/\nDisallow: /admin/\nSitemap: {Origin}/sitemap.xml\n";
        return Results.Text(text, "text/plain; charset=utf-8");
    }

    public IResult Sitemap()
    {
        if (Origin is null) return Results.Problem("Set Website:PublicOrigin to the real HTTPS domain before launch.", statusCode: 503);
        XNamespace ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
        var xml = new XDocument(new XElement(ns + "urlset", Pages.Select(page => new XElement(ns + "url", new XElement(ns + "loc", Origin + page.Path)))));
        return Results.Text(xml.ToString(), "application/xml; charset=utf-8");
    }

    public StaticFileOptions AssetOptions() => new()
    {
        FileProvider = new PhysicalFileProvider(Root),
        OnPrepareResponse = c =>
        {
            c.Context.Response.Headers.CacheControl = c.Context.Request.Path.StartsWithSegments("/assets")
                ? "public,max-age=31536000,immutable" : "public,max-age=3600";
            if (c.Context.Request.Path.StartsWithSegments("/licenses")) c.Context.Response.Headers["X-Robots-Tag"] = "noindex";
        }
    };
}
