# Package only an already verified Linux no-dev release. Never runs SSH or database commands.
import argparse,gzip,hashlib,json,os,pathlib,re,shutil,subprocess,tarfile
p=argparse.ArgumentParser();p.add_argument('--release',required=True);p.add_argument('--php',required=True);p.add_argument('--output',required=True);a=p.parse_args()
repo=pathlib.Path.cwd();release=pathlib.Path(a.release).resolve(strict=True);out=pathlib.Path(a.output)
assert os.name=='posix' and not out.exists(),'NEW_PRIVATE_LINUX_OUTPUT_REQUIRED'
sha=lambda b:hashlib.sha256(b).hexdigest()
original_manifest=sha((release/'MANIFEST.json').read_bytes())
subprocess.run([a.php,str(repo/'deployment/check-release.php'),str(release),original_manifest],check=True)
subprocess.run(['git','diff','--exit-code','HEAD','--','deployment','scripts','upms.php','upms.client'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
assert not subprocess.check_output(['git','ls-files','--others','--exclude-standard','--','deployment/staging'],text=True).strip(),'COMMITTED_TOOLS_REQUIRED'
source_commit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();assert re.fullmatch('[a-f0-9]{40}',source_commit)
plan=json.loads((repo/'deployment/staging/staging-plan.NOT-REVIEWED.json').read_text());target=plan['stagingRoot'];backend=target+'/payload/release/private/backend'
out.mkdir(mode=0o700,parents=False);payload=out/'payload';payload.mkdir(mode=0o700);shutil.copytree(release,payload/'release',symlinks=False)
m=json.loads((payload/'release/MANIFEST.json').read_text())
old_backend=str(release/'private/backend')
for entry in ['public/inquiry.php','management/gateway.php']:
 path=payload/'release'/entry;code=path.read_text();assert code.count("'"+old_backend+"'")==1,'REVIEWED_ENTRY_PREIMAGE_REQUIRED';code=code.replace("'"+old_backend+"'","'"+backend+"'");assert 'REPLACE_WITH_' not in code;path.write_text(code,newline='\n')
 for row in m['files']:
  if row['path']==entry:row.update(bytes=path.stat().st_size,sha256=sha(path.read_bytes()))
m.update(targetStagingRoot=target,entryBackendPath=backend,actualGoDaddyPathsVerified=False,sourceCommit=source_commit)
(payload/'release/MANIFEST.json').write_text(json.dumps(m,indent=2)+'\n')
subprocess.run([a.php,str(repo/'deployment/check-release.php'),str(payload/'release'),sha((payload/'release/MANIFEST.json').read_bytes())],check=True)
shutil.copytree(repo/'deployment/staging',payload/'tools')
# Exact existing PHP-8.2 import package; data import is never executed by any staging tool.
shutil.copytree(repo/'deployment/phpmyadmin',payload/'import-tools')
rows=[]
for path in sorted(payload.rglob('*')):
 assert not path.is_symlink(),'SYMLINK_REJECTED'
 if path.is_file():
  relative=path.relative_to(payload).as_posix();assert re.fullmatch(r'[a-zA-Z0-9_./@+-]+',relative),'UNREVIEWED_PATH'
  assert not re.search(r'(^|/)(\.env|node_modules|tests|fixtures|\.git)(/|$)|\.(log|pem|key|pfx|map)$',relative,re.I),'FORBIDDEN_PRIVATE_CONTENT'
  path.chmod(0o600);rows.append(dict(path=relative,bytes=path.stat().st_size,sha256=sha(path.read_bytes())))
 else:path.chmod(0o700)
sql=payload/'import-tools/upms-production-clean.sql'
bundle=dict(kind='PRIVATE_DISABLED_STAGING_BUNDLE',sourceCommit=source_commit,baseline='ed629f02f9e21e735598387fd33300c5e34b3b6e',targetStagingRoot=target,actualGoDaddyPathsVerified=False,runtimeEnabled=False,sqlImportExecuted=False,sqlSha256=sha(sql.read_bytes()),sqlManifestSha256=sha((payload/'import-tools/upms-production-clean-manifest.json').read_bytes()),releaseManifestSha256=sha((payload/'release/MANIFEST.json').read_bytes()),files=rows)
manifest=payload/'STAGING-MANIFEST.json';manifest.write_text(json.dumps(bundle,indent=2)+'\n');manifest.chmod(0o600)
archive=out/'upms-php83-private-staging.tar.gz'
with archive.open('wb') as raw, gzip.GzipFile(fileobj=raw,mode='wb',filename='',mtime=0) as gz, tarfile.open(fileobj=gz,mode='w') as tar:
 for path in sorted(payload.rglob('*')):
  info=tar.gettarinfo(str(path),arcname=path.relative_to(payload).as_posix());info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0
  if path.is_file():
   with path.open('rb') as f:tar.addfile(info,f)
  else:tar.addfile(info)
archive.chmod(0o600)
record=dict(prepared=True,sourceCommit=source_commit,archive=str(archive),archiveSha256=sha(archive.read_bytes()),stagingManifestSha256=sha(manifest.read_bytes()),releaseManifestSha256=bundle['releaseManifestSha256'],sqlSha256=bundle['sqlSha256'],sqlManifestSha256=bundle['sqlManifestSha256'],files=len(rows),fileCountIncludingManifest=len(rows)+1,directoryCount=sum(p.is_dir() for p in payload.rglob('*')),archiveBytes=archive.stat().st_size,extractedFileBytes=sum(r['bytes'] for r in rows)+manifest.stat().st_size,proposedStagingRoot=target,proposedBackendPath=backend,actualGoDaddyPathsVerified=False,uploaded=False,productionReady=False)
(out/'ARTIFACT.json').write_text(json.dumps(record,indent=2)+'\n');(repo/'tmp/php-runtime/php83-artifact.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))
