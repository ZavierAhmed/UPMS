// Deterministic ZIP32 artifact. Node standard library only; never reads .env or private outboxes.
import { readFile, readdir, mkdir, writeFile, lstat } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { deterministicZip } from "./lib/deterministic-zip.mjs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const nodeMajor=process.argv.find(a=>a.startsWith('--node-major='))?.split('=')[1];
const management=process.argv.includes('--management-release');
const godaddy=process.argv.includes('--godaddy-preview');
if(godaddy&&(!management||nodeMajor!=='22'))throw Error('GoDaddy preview requires the reviewed management Node 22 package');
if(nodeMajor&&!['22','24'].includes(nodeMajor))throw Error('Only reviewed runtime lines are supported');
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
if(management){
 put('PRODUCTION-HOSTING-READINESS.md',await readFile('docs/PRODUCTION-HOSTING-READINESS.md'));
 await collect('server/production-migrations',name=>name.endsWith('.js'));
 for(const name of ['server/migrations/202610210001_identity.js','server/simple-v1-migrations/202610240001_simple_v1.js','server/simple-v1-migrations/202610240002_entry_fixes.js','server/tools/production.mjs'])put(name,await readFile(name));
}
if(godaddy){
 for(const name of ['GODADDY-MANAGED-DB-COMPATIBILITY.md','GODADDY-PREVIEW-ENVIRONMENT.md','GODADDY-STAGING-TEST-RESULTS.md','GODADDY-PRODUCTION-BLOCKERS.md','GODADDY-BACKUP-RESTORE.md','GODADDY-PREVIEW-VARIABLES.txt'])put(name,await readFile('docs/deployment/'+name));
 put('.npmrc','registry=https://registry.npmjs.org/\n');
}
await collect("upms.client/dist", (name) =>
  /^upms\.client\/dist\/(?:assets\/[^/]+\.(?:js|css|svg|jpg|jpeg|png|webp|avif|woff2)|management\/(?:index\.html|assets\/[^/]+\.(?:js|css))|licenses\/[A-Za-z0-9-]+\.txt|_pages\/[A-Za-z0-9-]+\.html|index\.html|public-routes\.json|icons\.svg|favicon\.svg)$/.test(
    name,
  ),
);
put(
  "scripts/check-deployment.mjs",
  await readFile("scripts/check-deployment.mjs"),
);
const pkg = JSON.parse(await readFile("package.json", "utf8"));
pkg.main = "server/src/index.js";
if(godaddy)pkg.main='server/src/godaddy/index.js';
if(nodeMajor)pkg.engines={node:nodeMajor==='22'?'^22.23.4':'^24.22.0'};
// npm ci --omit=dev uses the unchanged root lockfile; scripts are not part of lock resolution.
pkg.scripts = {
  build: "node scripts/check-deployment.mjs",
  start: "node server/src/index.js",
};
if(godaddy)pkg.scripts.start='node server/src/godaddy/index.js';
put("package.json", JSON.stringify(pkg, null, 2) + "\n");
put("package-lock.json", await readFile("package-lock.json"));
put(".nvmrc", nodeMajor?(nodeMajor==='22'?'22.23.4\n':'24.22.0\n'):await readFile(".nvmrc"));
const routes = JSON.parse(
  files.get("upms.client/dist/public-routes.json").toString("utf8"),
);
const expectedPaths = ['/', '/about', '/products', '/manufacturing', '/industries', '/contact', '/products/buckets', '/products/cans', '/products/containers', '/products/custom'];
if (routes.pages.length !== expectedPaths.length ||
    JSON.stringify(routes.pages.map(p=>p.path).sort()) !== JSON.stringify(expectedPaths.sort()))
  throw new Error("Expected the ten approved public routes.");
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
      ...(godaddy?{kind:'godaddy-private-preview-blocked',providerAccepted:false,databaseOperationsEnabled:false}:{}),
      note: "Checksums describe packaged bytes; sourceCommit identifies the checkout base. Regenerate after the release commit.",
      files: checksums,
    },
    null,
    2,
  ) + "\n",
);

const zip = deterministicZip(files);
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
