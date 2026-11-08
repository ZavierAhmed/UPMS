"""Overlay only the reviewed PHP compatibility files onto the accepted candidate."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, json, subprocess

sha = lambda b: hashlib.sha256(b).hexdigest()
base = Path('tmp/phase-4/artifacts/p42c-final/upms-p4-management-php.zip')
expected = '1ea4d46e20e312f1dabf70f95ec511e3d4dc1c4a38bab958df886b470957b3a7'
if sha(base.read_bytes()) != expected:
    raise RuntimeError('BASE_ARCHIVE_REJECTED')
paths = ['app/Upms/CumulativeInitialization.php', 'app/Upms/ProductionRecoveryV2.php',
         'operations/backup-cumulative.php', 'app/Upms/ProductionProfile.php',
         'app/Http/Middleware/HostBoundary.php']
with ZipFile(base) as z:
    files = {n: z.read(n) for n in z.namelist()}
manifest = json.loads(files.pop('RELEASE.json'))
if set(files) != set(manifest['files']) or any(sha(files[n]) != h for n, h in manifest['files'].items()):
    raise RuntimeError('BASE_MANIFEST_REJECTED')
for p in paths:
    files['private/backend/' + p] = Path('upms.php/' + p).read_bytes()
manifest.update(sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
                parentArchiveSha256=expected, deploymentAdaptations=paths, operationalReady=False)
manifest['files'] = {n: sha(b) for n,b in sorted(files.items())}
files['RELEASE.json'] = (json.dumps(manifest,indent=2)+'\n').encode()
out = Path('tmp/phase-4.3/management-p43.zip')
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=9) as z:
    for n,b in sorted(files.items()):
        z.writestr(n,b)
with ZipFile(out) as z:
    if set(z.namelist()) != set(files) or any(z.read(n) != b for n,b in files.items()):
        raise RuntimeError('PATCH_MANIFEST_REJECTED')
result = dict(sha256=sha(out.read_bytes()), sourceCommit=manifest['sourceCommit'],
              manifestSha256=sha(files['RELEASE.json']),files=len(files),manifestVerified=True,
              parentSha256=expected,modified=paths)
Path('tmp/phase-4.3/management-p43-integrity.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
