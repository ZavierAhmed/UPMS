import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { phpBridge, privatePath } from './uath1-preview.mjs';
import { verifyUatEngine } from './php-7-5-engine-guard.mjs';

await verifyUatEngine();
const fixture = JSON.parse(await readFile(await privatePath('tmp/php-runtime/p41b-uat2a-extras.json'), 'utf8'));
const session = JSON.parse(await readFile(await privatePath('tmp/php-runtime/p41b-uat2a-extras-session.json'), 'utf8'));
assert.match(fixture.binding.schema, /^upms_test_php_money_\d+$/);
const envPath = await privatePath(fixture.envPath);
const profile = (await readFile(envPath, 'utf8')).split(/\r?\n/);
for (const line of ['UPMS_DB_HOST=127.0.0.1', 'UPMS_DB_PORT=3330', 'UPMS_DB_DATABASE=' + fixture.binding.schema]) {
  assert.ok(profile.includes(line), 'Expected local synthetic profile');
}
const key = randomUUID();
const input = { accountId: session.bankId, amount: '1.00', direction: 'IN',
  date: new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Karachi'}).format(new Date()),
  reference: 'P41B-ISOLATED-' + key, reason: 'Synthetic concurrent posting acceptance', approved: true };
async function call(method, path) {
  const start = performance.now();
  const result = await phpBridge(envPath, {
    method, path:'/api/v1/management/simple-v1/' + path, cookies:session.cookies,
    ...(method === 'POST' ? {raw:JSON.stringify(input),headers:{
      origin:'https://app.unique-plastic.test','x-csrf-token':session.csrf,'idempotency-key':key,
    }} : {}),
  });
  return {status:result.status,body:JSON.parse(result.raw),ms:Math.round(performance.now()-start)};
}
function cents(response) {
  assert.equal(response.status, 200, response.body.error?.code);
  const balance = response.body.accounts.find(account => String(account.id) === String(session.bankId)).balance;
  return BigInt(balance.replace('.',''));
}
const before = cents(await call('GET','money'));
const [post, observed, replay] = await Promise.all([call('POST','money/sources'),call('GET','money'),call('POST','money/sources')]);
const after = cents(await call('GET','money'));
const report = {passed:false,isolated:true,concurrentRequests:3,postStatus:post.status,readStatus:observed.status,
  replayStatus:replay.status,postMs:post.ms,readMs:observed.ms,replayMs:replay.ms,
  oneMovement:after-before===100n,sameReceipt:!!post.body.id&&post.body.id===replay.body.id};
try {
  assert.equal(post.status,201);
  assert.equal(replay.status,201);
  assert.ok(report.oneMovement&&report.sameReceipt);
  assert.ok([before,after].includes(cents(observed)));
  report.passed=true;
} finally {
  await writeFile('docs/phase-4.1b/evidence/concurrent-post.json',JSON.stringify(report,null,2)+'\n');
}
