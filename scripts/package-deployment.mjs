// Deterministic ZIP32 artifact. Node standard library only; never reads .env or private outboxes.
import { readFile, readdir, mkdir, writeFile, lstat } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { deflateRawSync, crc32 } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const files = new Map();
const put = (name, data) =>
  files.set(name, Buffer.isBuffer(data) ? data : Buffer.from(data));
async function collect(directory, accept) {
  if ((await lstat(resolve(root, directory))).isSymbolicLink())
    throw new Error(`Symlink directory is not deployable: ${directory}`);
  for (const entry of (await readdir(resolve(root, directory))).sort()) {
    const name = `${directory}/${entry}`;
    const info = await lstat(resolve(root, name));
    if (info.isSymbolicLink())
      throw new Error(`Symlinks are not release files: ${name}`);
    if (info.isDirectory()) await collect(name, accept);
    else if (accept(name)) put(name, await readFile(resolve(root, name)));
    else throw new Error(`Unexpected deployment file: ${name}`);
  }
}
await collect("server/src", (name) => name.endsWith(".js"));
await collect("upms.client/dist", (name) =>
  /^upms\.client\/dist\/(?:assets\/[^/]+\.(?:js|css|svg|jpg|jpeg|png|webp|avif|woff2)|licenses\/[A-Za-z0-9-]+\.txt|_pages\/[A-Za-z0-9-]+\.html|index\.html|public-routes\.json|icons\.svg|favicon\.svg)$/.test(
    name,
  ),
);
put(
  "scripts/check-deployment.mjs",
  await readFile("scripts/check-deployment.mjs"),
);
const pkg = JSON.parse(await readFile("package.json", "utf8"));
// npm ci --omit=dev uses the unchanged root lockfile; scripts are not part of lock resolution.
pkg.scripts = {
  build: "node scripts/check-deployment.mjs",
  start: "node server/src/index.js",
};
put("package.json", JSON.stringify(pkg, null, 2) + "\n");
put("package-lock.json", await readFile("package-lock.json"));
put(".nvmrc", await readFile(".nvmrc"));
const routes = JSON.parse(
  files.get("upms.client/dist/public-routes.json").toString("utf8"),
);
if (
  routes.pages.length !== 11 ||
  new Set(routes.pages.map((p) => p.path)).size !== 11
)
  throw new Error("Expected eleven public routes.");
for (const file of [...routes.pages.map((p) => p.file), routes.notFoundFile]) {
  if (!files.has(`upms.client/dist/${file}`))
    throw new Error("A prerendered document is missing.");
}
const checksums = Object.fromEntries(
  [...files]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([name, bytes]) => [
      name,
      createHash("sha256").update(bytes).digest("hex"),
    ]),
);
put(
  "deployment-manifest.json",
  JSON.stringify(
    {
      sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      note: "Checksums describe packaged bytes, including any local W06 edits; commit is the checkout base until committed.",
      files: checksums,
    },
    null,
    2,
  ) + "\n",
);

const local = [],
  central = [];
let offset = 0;
for (const [name, raw] of [...files].sort(([a], [b]) =>
  a.localeCompare(b, "en"),
)) {
  const filename = Buffer.from(name);
  const data = deflateRawSync(raw, { level: 9 });
  if (raw.length > 0xffffffff || offset + data.length > 0xffffffff)
    throw new Error("ZIP64 would be required.");
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(33, 12); // fixed 1980-01-01
  header.writeUInt32LE(crc32(raw), 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(raw.length, 22);
  header.writeUInt16LE(filename.length, 26);
  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50);
  directory.writeUInt16LE(20, 4);
  header.copy(directory, 6, 4, 30);
  directory.writeUInt32LE(offset, 42);
  local.push(header, filename, data);
  central.push(directory, filename);
  offset += header.length + filename.length + data.length;
}
if (files.size > 65535) throw new Error("ZIP64 would be required.");
const directoryBytes = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(files.size, 8);
end.writeUInt16LE(files.size, 10);
end.writeUInt32LE(directoryBytes.length, 12);
end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...local, directoryBytes, end]);
const output = resolve("artifacts/upms-node-deployment.zip");
if (relative(root, output).startsWith(".."))
  throw new Error("Output must remain in the workspace.");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, zip);
const digest = createHash("sha256").update(zip).digest("hex");
await writeFile(output + ".sha256", `${digest}  upms-node-deployment.zip\n`);
console.log(
  `Packaged ${files.size} files (${zip.length} bytes) into ${output}\nSHA256 ${digest}`,
);
