import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const php=process.env.PHP82_BINARY||resolve('tmp/php-runtime/bin/php.exe'),directory='deployment/phpmyadmin';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');let checks=0;
const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const names=(await readdir(directory)).sort();check(names,['README-PHPMYADMIN-IMPORT.md','finalize-clean-import.php','upms-production-clean-manifest.json','upms-production-clean.sql','verify-clean-import.php']);
const before=Object.fromEntries(await Promise.all(names.map(async n=>[n,sha(await readFile(directory+'/'+n))])));
const generated=spawnSync(php,['upms.php/scripts/generate-clean-sql.php'],{encoding:'utf8',windowsHide:true});check(generated.status,0);
for(const name of names){const bytes=await readFile(directory+'/'+name);check(sha(bytes),before[name]);check(bytes.includes(13),false);}
const manifest=JSON.parse(await readFile(directory+'/upms-production-clean-manifest.json','utf8'));check(manifest.sqlSha256,before['upms-production-clean.sql']);
for(const [name,hash] of Object.entries(manifest.files))check(before[name],hash);
const sql=await readFile(directory+'/upms-production-clean.sql','utf8');
const seeded=[...sql.matchAll(/INSERT INTO `([^`]+)`/g)].map(m=>m[1]);check([...new Set(seeded)].sort(),['identity_guard','permissions','role_permissions','roles','v1_control']);
assert.ok(!sql.includes('$argon2')&&!sql.includes('upms_test_php_'));checks++;
for(const name of ['verify-clean-import.php','finalize-clean-import.php']){const lint=spawnSync(php,['-l',directory+'/'+name],{encoding:'utf8',windowsHide:true});check(lint.status,0);}
const diagnostic='deployment/manual/upms-pdo-check.php',original=sha(await readFile(diagnostic));check(spawnSync(process.execPath,['scripts/php-8-2-diagnostic-bundle.mjs'],{windowsHide:true}).status,0);check(sha(await readFile(diagnostic)),original);
check(spawnSync(php,['-l',diagnostic],{windowsHide:true}).status,0);
const failure=spawnSync(php,[diagnostic,'--profile','/nonexistent/upms-synthetic-profile','--diagnose'],{encoding:'utf8',windowsHide:true});check(failure.status,1);const parsed=JSON.parse(failure.stdout);check(parsed.category,'profile_validation');check(parsed.recordsChanged,0);check(failure.stdout.includes('/nonexistent'),false);check(failure.stderr,'');
const result={passed:true,checks,reproducible:true,packageFiles:5,sqlSha256:manifest.sqlSha256,manifestSha256:before['upms-production-clean-manifest.json'],diagnosticSha256:original,credentialsIncluded:false,businessRowsIncluded:0,productionContacted:false};await writeFile('tmp/php-runtime/php82-package.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
