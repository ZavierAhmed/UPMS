import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { deterministicZip } from './lib/deterministic-zip.mjs';

const baseline = 'tmp/phase-4.1/security-baseline';
const candidate = 'tmp/phase-4/vendor-stage';
const output = 'tmp/phase-4.1/security';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const allowed = /^vendor\/(?:composer\/|symfony\/(?:http-foundation|http-kernel|routing)\/)/;

async function list(root, path) {
  const files = [];
  for (const entry of await readdir(root + '/' + path, { withFileTypes: true })) {
    const name = path + '/' + entry.name;
    if (entry.isDirectory()) files.push(...await list(root, name));
    else {
      assert.ok(entry.isFile(), 'Only regular files permitted: ' + name);
      files.push(name);
    }
  }
  return files;
}

assert.equal(sha256(await readFile(candidate + '/composer.lock')), sha256(await readFile('upms.php/composer.lock')));
assert.equal(sha256(await readFile(candidate + '/composer.json')), sha256(await readFile(baseline + '/composer.json')));
const oldPaths = new Set(['composer.lock', ...await list(baseline, 'vendor')]);
const newPaths = new Set(['composer.lock', ...await list(candidate, 'vendor')]);
const payload = new Map();
const changes = [];
for (const path of [...new Set([...oldPaths, ...newPaths])].sort()) {
  const before = oldPaths.has(path) ? sha256(await readFile(baseline + '/' + path)) : null;
  const bytes = newPaths.has(path) ? await readFile(candidate + '/' + path) : null;
  const after = bytes ? sha256(bytes) : null;
  if (before === after) continue;
  assert.ok(path === 'composer.lock' || allowed.test(path), 'Unexpected dependency drift: ' + path);
  changes.push({ path, before, after });
  if (bytes) payload.set('files/' + path, bytes);
}
assert.ok(changes.some(change => change.path === 'composer.lock'));
const manifest = {
  baselineSource: 'c0d05b340cbaa136464015669fe650060e450f12',
  candidateSource: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  platform: 'local Composer rehearsal',
  productionBaselineParityVerified: false,
  publicationAuthorized: false,
  changes,
};
payload.set('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
const archive = deterministicZip(payload);
await mkdir(output, { recursive: true });
await writeFile(output + '/upms-symfony-security-review.zip', archive);
await writeFile('docs/phase-4.1/evidence/security-patch.json', JSON.stringify({ ...manifest, archiveSha256: sha256(archive) }, null, 2) + '\n');
