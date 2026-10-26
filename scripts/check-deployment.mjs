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
if(release.kind==='godaddy-management-disabled-preview'){
  if(release.managementOnly!==true||release.databaseOperationsEnabled!==false||release.operationalReady!==false||!release.files['upms.client/dist/management/index.html']||Object.keys(release.files).some(name=>name.startsWith('upms.client/dist/')&&!name.startsWith('upms.client/dist/management/')))throw Error('Invalid management-only release');
  const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
  if(pkg.main!=='server/src/godaddy/management-index.js'||pkg.scripts.start!=='node server/src/godaddy/management-index.js'||pkg.scripts.build!=='node scripts/check-deployment.mjs')throw Error('Invalid disabled management entry');
  console.log(`Verified ${Object.keys(release.files).length} files; built management only; operational database blocked.`);
}else{
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

}
