// Used by the prebuilt ZIP's build command. No frontend toolchain or secrets needed.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const root = process.cwd();
const release = JSON.parse(
  await readFile(resolve(root, "deployment-manifest.json"), "utf8"),
);
for (const [file, expected] of Object.entries(release.files)) {
  if (file.startsWith("/") || file.includes("..") || file.includes("\\"))
    throw new Error("Invalid release path.");
  const actual = createHash("sha256")
    .update(await readFile(resolve(root, file)))
    .digest("hex");
  if (actual !== expected)
    throw new Error(`Release checksum mismatch: ${file}`);
}
const routes = JSON.parse(
  await readFile(resolve(root, "upms.client/dist/public-routes.json"), "utf8"),
);
const expectedPaths = ['/', '/about', '/products', '/manufacturing', '/industries', '/contact', '/products/buckets', '/products/cans', '/products/containers', '/products/custom'];
if (routes.pages.length !== expectedPaths.length ||
    JSON.stringify(routes.pages.map(p=>p.path).sort()) !== JSON.stringify(expectedPaths.sort()))
  throw new Error("Expected the ten approved public routes.");
console.log(
  `Verified ${Object.keys(release.files).length} release files and ten prerendered routes.`,
);
