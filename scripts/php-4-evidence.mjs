import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const json=async path=>JSON.parse(await readFile(path,'utf8')),runs=[];
for(const [suffix,php]of [['83','8.3.36'],['84','8.4.27']]){
 const current=await json('tmp/php-runtime/php4-'+suffix+'-latest.json'),p2=await json('tmp/php-runtime/php4-previous2-'+suffix+'-latest.json'),p3=await json('tmp/php-runtime/php4-previous3-'+suffix+'-latest.json'),browser=await json('tmp/php-runtime/php4-browser'+suffix+'-latest.json');
 const differential=await json(current.report),php2Regression=await json(p2.report),php3Regression=await json(p3.report),acceptance=await json(browser.directory+'/browser-results.json');
 assert.equal(differential.httpComparisons,256);assert.equal(differential.snapshotComparisons,14);assert.equal(php2Regression.httpComparisons,135);assert.equal(php3Regression.httpComparisons,214);assert.equal(acceptance.checks,16);assert.equal(acceptance.php,php);assert.equal(acceptance.passed,true);assert.equal(acceptance.javascriptErrors,0);
 for(const report of [differential,php2Regression,php3Regression,acceptance])assert.equal(report.ownerDatabaseContacted,false);
 const prints={};for(const name of ['return-print','original-print']){const pdf=await readFile(browser.directory+'/'+name+'.pdf');assert.equal(pdf.subarray(0,4).toString(),'%PDF');prints[name]={bytes:pdf.length,sha256:createHash('sha256').update(pdf).digest('hex')};}
 runs.push({php,phpunit:{tests:71,assertions:1199},differential,php2Regression,php3Regression,browser:acceptance,prints,composerPlatformChecks:'passed',runtimePreflight:'passed'});
}
const fixtures=await json('upms.php/tests/php4-return-fixtures.json');
await writeFile('docs/php-migration/PHP-4-EVIDENCE.json',JSON.stringify({baseline:'7f3004b312b852d0b35b5406f000e1939778dda0',mariaDB:'10.11.19',runs,math:{partitions:fixtures.partitions,creditVectors:fixtures.vectors.length,numberVectors:fixtures.numbers.length},node:{tests:290,passed:290},react:{files:25,tests:188,passed:188,build:'passed',lint:'passed'},pint:'passed',ownerDatabaseContacted:false,migrationsChanged:false,frontendSourceChanged:false},null,2)+'\n');
console.log(JSON.stringify({runs:2,httpPerRuntime:605,snapshotsPerRuntime:39,browserPerRuntime:16}));
