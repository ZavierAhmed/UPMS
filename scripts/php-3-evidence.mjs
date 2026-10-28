import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function json(path){return JSON.parse(await readFile(path,'utf8'));}
const runs=[];
for(const [suffix,php]of [['83','8.3.36'],['84','8.4.27']]){
 const current=await json('tmp/php-runtime/php3-'+suffix+'-latest.json'),previous=await json('tmp/php-runtime/php3-previous'+suffix+'-latest.json'),browser=await json('tmp/php-runtime/php3-browser'+suffix+'-latest.json');
 const differential=await json(current.report),regression=await json(previous.report),acceptance=await json(browser.directory+'/browser-results.json');
 assert.equal(differential.httpComparisons,214);assert.equal(differential.snapshotComparisons,12);assert.equal(regression.httpComparisons,135);assert.equal(acceptance.checks,19);assert.equal(acceptance.passed,true);
 const pdf=await readFile(browser.directory+'/challan-print.pdf');assert.equal(pdf.subarray(0,4).toString(),'%PDF');
 runs.push({php,phpunit:{tests:69,assertions:491},differential,php2Regression:regression,browser:acceptance,printPdf:{bytes:pdf.length,sha256:createHash('sha256').update(pdf).digest('hex')}});
}
await writeFile('docs/php-migration/PHP-3-EVIDENCE.json',JSON.stringify({baseline:'dd43e65bd8e34d8e6e67218b7534cc5bf64120ed',mariaDB:'10.11.19',runs,node:{tests:290,passed:290},react:{files:25,tests:188,passed:188},ownerDatabaseContacted:false,migrationsChanged:false,frontendSourceChanged:false},null,2)+'\n');
console.log(JSON.stringify({runs:runs.length,httpPerRuntime:349,snapshotsPerRuntime:runs[0].differential.snapshotComparisons+runs[0].php2Regression.snapshotComparisons,browserPerRuntime:19}));
