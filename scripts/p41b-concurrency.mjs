import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {cp,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import mysql from 'mysql2/promise';
import {employeePreview,phpBridge,privatePath} from './uath1-preview.mjs';
import {verifyUatEngine} from './php-7-5-engine-guard.mjs';

await verifyUatEngine();
const fixture=JSON.parse(await readFile(await privatePath('tmp/php-runtime/p4-uat2a-extras.json'),'utf8'));
const envPath=await privatePath(fixture.envPath);
const env=Object.fromEntries((await readFile(envPath,'utf8')).split(/\r?\n/)
  .filter(line=>line.includes('=')).map(line=>[line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)]));
assert.match(fixture.binding.schema,/^upms_test_php_money_\d+$/);
assert.equal(env.UPMS_DB_DATABASE,fixture.binding.schema);
assert.equal(env.UPMS_DB_HOST,'127.0.0.1');
assert.equal(env.UPMS_DB_PORT,'3330');
const sessions=Array.from({length:5},()=>{
  const child=spawnSync('tmp/php-runtime/bin/php.exe',['upms.php/tests/Support/uat3-session.php'],{
    input:JSON.stringify({binding:fixture.binding,envPath}),encoding:'utf8',windowsHide:true,
    env:Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('UPMS_'))),
  });
  assert.equal(child.status,0,'Isolated session creation failed');
  return JSON.parse(child.stdout);
});
const report={passed:false,independentSessions:5,distinctActors:1,cases:[]};
async function request(session,path,method='GET'){
  const start=performance.now();
  const response=await phpBridge(envPath,{
    path:'/api/v1/management/'+path,method,cookies:{'__Host-upms-php':session.token},
    ...(method==='POST'?{raw:'{}',headers:{origin:'https://app.unique-plastic.test','x-csrf-token':session.csrfToken}}:{}),
  });
  return {path,status:response.status,code:response.raw?JSON.parse(response.raw).error?.code:undefined,
    reference:response.requestReference,ms:Math.round(performance.now()-start)};
}
async function batch(label,requests){
  const results=await Promise.all(requests);
  report.cases.push({label,results});
  assert.ok(results.every(result=>result.status===200),label);
}
const db=await mysql.createConnection({host:'127.0.0.1',port:3330,database:fixture.binding.schema,
  user:env.UPMS_DB_USERNAME,password:env.UPMS_DB_PASSWORD});
try{
  const paths=['state','documents?kind=CHALLAN','parties?kind=VENDOR','money','employee-hafta','cheques'];
  await db.beginTransaction();
  await db.query('SELECT id FROM identity_guard WHERE id=1 LOCK IN SHARE MODE');
  await batch('held shared guard, five sessions',sessions.map(session=>request(session,'simple-v1/documents')));
  await db.rollback();
  for(const path of paths){
    await batch('five concurrent sessions',sessions.map(session=>request(session,'simple-v1/'+path)));
  }
  await batch('three parallel reads, one session',paths.slice(0,3).map(path=>request(sessions[0],'simple-v1/'+path)));
  await db.beginTransaction();
  await db.query('SELECT id FROM identity_guard WHERE id=1 FOR UPDATE');
  const blocked=await request(sessions[0],'simple-v1/documents');
  report.cases.push({label:'held exclusive guard',results:[blocked]});
  assert.equal(blocked.status,503);
  assert.equal(blocked.code,'READ_BUSY');
  await db.rollback();
  const logout=await request(sessions[0],'session/logout','POST');
  const revoked=await request(sessions[0],'simple-v1/documents');
  report.cases.push({label:'logout then read',results:[logout,revoked]});
  assert.equal(logout.status,204);
  assert.equal(revoked.status,401);
  const outageStart=performance.now();
  const outageWorker=spawnSync('tmp/php-runtime/bin/php.exe',['upms.php/tests/Support/http-bridge.php'],{
    input:JSON.stringify({method:'GET',path:'/api/v1/management/simple-v1/state',
      cookies:{'__Host-upms-php':sessions[1].token}}),
    encoding:'utf8',windowsHide:true,timeout:10000,
    env:{...Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('UPMS_'))),
      UPMS_PHP2_ENV:envPath,UPMS_DB_HOST:'127.0.0.1',UPMS_DB_PORT:'1'},
  });
  assert.equal(outageWorker.status,0,'Isolated outage worker did not finish');
  const outage=JSON.parse(outageWorker.stdout);
  const outageCode=JSON.parse(outage.raw).error?.code;
  report.cases.push({label:'isolated connection refused',results:[{
    status:outage.status,code:outageCode,ms:Math.round(performance.now()-outageStart),
    reference:outage.requestReference,
  }]});
  assert.equal(outage.status,503);
  assert.equal(outageCode,'IDENTITY_UNAVAILABLE');
  if(process.argv.includes('--chrome')||process.argv.includes('--stale-only')){
    const {default:puppeteer}=await import('puppeteer-core');
    const assetRoot='tmp/php-runtime/p41b-chrome-'+Date.now();
    await cp('upms.client/dist/management',assetRoot,{recursive:true});
    const port=5230;
    const origin='http://127.0.0.1:'+port;
    const cookieName='p41b_chrome';
    const preview=await employeePreview(fixture.bindingPath,{port,cookieName,assetRoot});
    const server=createServer((req,res)=>preview.handler(req,res).catch(()=>{
      if(!res.headersSent)res.writeHead(503);
      res.end();
    }));
    await new Promise((done,fail)=>{
      server.once('error',fail);
      server.listen(port,'127.0.0.1',done);
    });
    let browser;
    try{
      browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
      const contexts=await Promise.all([1,2].map(()=>browser.createBrowserContext()));
      const staleOnly=process.argv.includes('--stale-only');
      const tabs=await Promise.all((staleOnly?[contexts[0]]:[contexts[0],contexts[0],contexts[1]])
        .map(context=>context.newPage()));
      const failures=[];
      await Promise.all(tabs.map(async(page,index)=>{
        page.on('response',response=>{
          const path=new URL(response.url()).pathname;
          if(path.startsWith('/api/')&&response.status()>=400)failures.push({path,status:response.status()});
        });
        await page.setCookie({name:cookieName,value:sessions[index===2?2:1].token,url:origin,httpOnly:true});
      }));
      report.chrome={tabs:tabs.length,cookieContexts:staleOnly?1:2,distinctActors:1,navigation:[],failures};
      const paths=staleOnly?[]:['', '/challans','/vendors','/money-accounts','/ledgers','/employee-hafta','/cheques','/challans'];
      for(const path of paths){
        const started=performance.now();
        const views=await Promise.all(tabs.map(async page=>{
          await page.goto(origin+'/management'+path);
          await page.waitForSelector('main h1');
          await page.waitForNetworkIdle({idleTime:400});
          return page.evaluate(()=>({heading:document.querySelector('main h1')?.textContent,
            alerts:document.querySelectorAll('main [role=alert]').length}));
        }));
        report.chrome.navigation.push({path,views,ms:Math.round(performance.now()-started)});
        assert.ok(views.every(view=>view.heading&&view.alerts===0),path);
      }
      if(staleOnly){
        const page=tabs[0];
        let held;
        let signalHeld;
        const heldRequest=new Promise(done=>{signalHeld=done;});
        let signalCancelled;
        const cancelled=new Promise(done=>{signalCancelled=done;});
        await page.setRequestInterception(true);
        page.on('request',request=>{
          if(!held&&new URL(request.url()).pathname.endsWith('/simple-v1/state')){
            held=request;
            signalHeld();
          }else request.continue().catch(()=>{});
        });
        page.on('requestfailed',request=>{
          if(request===held&&request.failure()?.errorText==='net::ERR_ABORTED')signalCancelled();
        });
        await page.goto(origin+'/management/challans');
        await Promise.race([heldRequest,new Promise((_,fail)=>setTimeout(()=>fail(Error('No stale request to hold')),10000).unref())]);
        await page.evaluate(()=>{
          history.pushState({},'','/management/vendors');
          dispatchEvent(new PopStateEvent('popstate'));
        });
        await page.waitForFunction(()=>document.querySelector('main h1')?.textContent==='Vendors');
        await Promise.race([cancelled,new Promise((_,fail)=>setTimeout(()=>fail(Error('Stale request was not cancelled')),10000).unref())]);
        report.chrome.staleReadCancelled=true;
      }
      assert.deepEqual(failures,[]);
    }finally{
      if(browser)await browser.close();
      server.closeAllConnections();
      await new Promise(done=>server.close(done));
    }
  }
  report.passed=true;
}finally{
  await db.rollback();
  await db.end();
  const name=process.argv.includes('--stale-only')?'concurrency-stale.json':'concurrency.json';
  await writeFile('docs/phase-4.1b/evidence/'+name,JSON.stringify(report,null,2)+'\n');
}
