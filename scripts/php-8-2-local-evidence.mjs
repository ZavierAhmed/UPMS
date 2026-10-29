import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='tmp/php-runtime/',sha=b=>createHash('sha256').update(b).digest('hex'),logs=[];
async function read(name){const b=await readFile(base+name);logs.push({path:name,sha256:sha(b)});return b.toString('utf8');}
async function last(name){return JSON.parse((await read(name)).trim().split(/\r?\n/).at(-1));}
const result={baseline:'27214ba6af63e9207b479a7574dcfb4bfb5fc3ff',branch:'feature/upms-php-8-2-phpmyadmin-clean-import',generatedAt:new Date().toISOString(),productionStatus:'BLOCKED',productionContacted:false,productionImported:false,productionUsersCreated:false,deployed:false,checks:{},logs};
for(const version of ['83','84']){const r=await last('php82-import'+version+'.log');assert.equal(r.passed,true);assert.equal(r.checks,149);result.checks['import'+version]={checks:r.checks,canonicalTables:20,initialApplicationUsers:0,initialBusinessRows:0,afterPrivateProvisioningUsers:2,bothActorsReadAndPost:true,syntheticSchema:r.schema};const unit=await read('php82-phpunit'+version+'.log');assert.match(unit,/OK \(89 tests, 1468 assertions\)/);result.checks['phpunit'+version]={tests:89,assertions:1468,memoryLimit:'128M'};}
const legacy=await last('php82-legacy-init83.log');assert.equal(legacy.checks,76);result.checks.legacyInitializer={checks:76,php:'8.3.36'};
const financial=await last('php82-financial.log');assert.equal(financial.httpComparisons,427);assert.equal(financial.snapshots,14);result.checks.financial={httpComparisons:427,snapshots:14,sqlImportedFixtures:true,primary:'haris',php:'8.3.36'};
const react=await read('php82-react.log');assert.match(react,/Tests\s+210 passed/);assert.match(react,/Test Files\s+30 passed/);result.checks.react={tests:210,files:30};await read('php82-react-lint.log');const build=await read('php82-react-build.log');assert.match(build,/built in/);result.checks.reactLintAndBuild={passed:true,chunkSizeAdvisory:true};
assert.match(await read('php82-pint.log'),/"result":"passed"/);result.checks.pint=true;
for(const name of ['socket','runtime','checksum','source-match']){const parsed=JSON.parse(await read('php82-linux-'+name+'.json'));assert.equal(parsed.passed,true);result.checks['linux-'+name]=parsed;}
const pkg=JSON.parse(await read('php82-package.json'));assert.equal(pkg.passed,true);assert.equal(pkg.checks,29);result.package=pkg;
assert.equal(sha(await readFile('deployment/phpmyadmin/upms-production-clean.sql')),pkg.sqlSha256);assert.equal(sha(await readFile('deployment/phpmyadmin/upms-production-clean-manifest.json')),pkg.manifestSha256);assert.equal(sha(await readFile('deployment/manual/upms-pdo-check.php')),pkg.diagnosticSha256);
const manifest=await readFile(base+'php82-linux-manifest.json');assert.equal(sha(manifest),result.checks['linux-source-match'].manifestSha256);assert.equal(result.checks['linux-source-match'].files,6041);
result.notRerun=['full legacy financial matrix','all four primary/PHP financial combinations','unchanged Express backend suite','unchanged SMTP/inquiry/journal matrix','unchanged native Apache thirteen-case suite','actual GoDaddy phpMyAdmin/UI/production checks'];
await writeFile('docs/php-migration/PHP-8-2-LOCAL-EVIDENCE.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,sqlSha256:pkg.sqlSha256,manifestSha256:pkg.manifestSha256,linuxFiles:6041,productionReady:false}));
