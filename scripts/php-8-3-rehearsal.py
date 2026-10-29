# Actual Linux-only rehearsal: copies only the reviewed artifact into a new private synthetic home.
import hashlib,json,os,pathlib,shutil,subprocess,time
repo=pathlib.Path.cwd();base=pathlib.Path.home()/'.cache/upms-php81-local';php=str(base/'bin/php');record=json.loads((repo/'tmp/php-runtime/php83-artifact.json').read_text());source=pathlib.Path(record['archive']).parent/'payload';fixture=base/('php83-rehearsal-'+str(time.time_ns()));fixture.mkdir(mode=0o700);home=fixture/'home';home.mkdir(mode=0o700)
for part in ['public_html','upms-php8-preflight','upms-php83-staging']:(home/part).mkdir(mode=0o700)
(home/'public_html/dashboard').mkdir(mode=0o700);stage=home/'upms-php83-staging';payload=stage/'payload';shutil.copytree(source,payload);checks=0;sha=lambda b:hashlib.sha256(b).hexdigest()
bundle=json.loads((payload/'STAGING-MANIFEST.json').read_text());old_backend=bundle['targetStagingRoot']+'/payload/release/private/backend';backend=str(payload/'release/private/backend');release=json.loads((payload/'release/MANIFEST.json').read_text())
for entry in ['public/inquiry.php','management/gateway.php']:
 p=payload/'release'/entry;s=p.read_text();assert s.count("'"+old_backend+"'")==1;p.write_text(s.replace("'"+old_backend+"'","'"+backend+"'"))
 for row in release['files']:
  if row['path']==entry:row.update(bytes=p.stat().st_size,sha256=sha(p.read_bytes()))
release.update(targetStagingRoot=str(stage),entryBackendPath=backend);(payload/'release/MANIFEST.json').write_text(json.dumps(release,indent=2)+'\n');bundle.update(targetStagingRoot=str(stage),releaseManifestSha256=sha((payload/'release/MANIFEST.json').read_bytes()))
for row in bundle['files']:
 p=payload/row['path'];row.update(bytes=p.stat().st_size,sha256=sha(p.read_bytes()))
(payload/'STAGING-MANIFEST.json').write_text(json.dumps(bundle,indent=2)+'\n');pin=sha((payload/'STAGING-MANIFEST.json').read_bytes())
plan=json.loads((payload/'tools/staging-plan.NOT-REVIEWED.json').read_text());plan.update(home=str(home),publicRoot=str(home/'public_html'),managementRoot=str(home/'public_html/dashboard'),diagnosticRoot=str(home/'upms-php8-preflight'),stagingRoot=str(stage));planfile=stage/'reviewed-plan.json'
def save():planfile.write_text(json.dumps(plan));planfile.chmod(0o600)
def call(name,args=[],success=True):
 global checks
 p=subprocess.run([php,str(payload/'tools'/name),'--plan',str(planfile),*args],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env={**os.environ,'UPMS_ENABLED':'true','APP_CONFIG_CACHE':'/unreviewed-inherited-config.php'})
 assert p.returncode==(0 if success else 1),(name,'unexpected exit',p.stdout.decode()[:600]);r=json.loads(p.stdout);assert not p.stderr,(name,'unexpected stderr');checks+=1;return r
save();assert call('prepare-runtime.php',success=False)['prepared'] is False;checks+=1
plan.update(destinationReviewed=True,accountQuotaReviewed=True);save();assert call('prepare-runtime.php')['keyCreated'] is True;checks+=1
key=(stage/'runtime/app-key').read_bytes();assert call('prepare-runtime.php')['keyCreated'] is False;assert (stage/'runtime/app-key').read_bytes()==key;checks+=2
assert call('verify-staging.php',['--manifest-sha','0'*64],False)['failure']=='INDEPENDENT_BUNDLE_DIGEST_REQUIRED';checks+=1
for _ in range(2):
 r=call('verify-staging.php',['--manifest-sha',pin]);assert r['privateStagingChecksPassed'] is True;assert r['database']=='PENDING_SELECT_ONLY_PROFILE';assert r['backupRestore']=='PENDING_INDEPENDENT_EVIDENCE';assert r['runtime']=='DISABLED';assert r['cliRuntime']['checks']==4;assert r['cliRuntime']['databaseConnected'] is False;assert key.decode() not in json.dumps(r);checks+=7
p=payload/'release/public/index.html';original=p.read_bytes();p.write_bytes(original+b'\nSYNTHETIC_TAMPER');assert call('verify-staging.php',['--manifest-sha',pin],False)['failure']=='BUNDLE_CHECKSUM_REJECTED';p.write_bytes(original);checks+=1
p=payload/'release/public/.env';assert not p.exists();p.write_text('SYNTHETIC_EXTRA');assert call('verify-staging.php',['--manifest-sha',pin],False)['failure']=='BUNDLE_FILE_SET_REJECTED';p.unlink();checks+=1
r=call('verify-staging.php',['--manifest-sha',pin]);assert r['privateStagingChecksPassed'];checks+=1
assert sha(pathlib.Path(record['archive']).read_bytes())==record['archiveSha256'];checks+=1
# Rehearsal tools intentionally bind different private test paths; distributable artifact stays unchanged.
result=dict(passed=True,checks=checks,kernelChecksEach=4,repeatVerification=True,privateKeyStable=True,artifactUnchanged=True,databaseConnected=False,productionContacted=False,uploaded=False,fixture=str(fixture));(repo/'tmp/php-runtime/php83-rehearsal.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
