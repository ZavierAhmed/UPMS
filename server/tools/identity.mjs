import { createInterface } from 'node:readline/promises';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createDatabase, capabilities } from '../src/identity/database.js';
import { migrate } from '../src/identity/migrations.js';
import { createIdentityService } from '../src/identity/service.js';
import { createInput } from '../src/identity/validation.js';
import { hashPassword, verifyPassword } from '../src/identity/passwords.js';

// Masked TTY input; never echo passwords or accept them in command arguments.
async function hidden(label) {
  if (!process.stdin.isTTY) throw new Error('Bootstrap requires an interactive local terminal.');
  process.stdout.write(label);
  process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => { process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); error ? reject(error) : resolve(value); };
    const onData = chunk => { for (const ch of chunk) {
      if (ch === '\u0003') return finish(new Error('Cancelled.'));
      if (ch === '\r' || ch === '\n') return finish();
      if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
      else if (ch >= ' ' && value.length < 128) value += ch;
    } };
    process.stdin.on('data', onData);
  });
}
let db;
try {
  const command = process.argv[2];
  if (command === 'benchmark') {
    const password = randomBytes(32).toString('hex');
    const started = performance.now(); const hash = await hashPassword(password);
    const hashed = performance.now(); await verifyPassword(hash, password);
    console.info(JSON.stringify({ hashMs: Math.round(hashed - started), verifyMs: Math.round(performance.now() - hashed), memoryKiBPerHash: 19456, concurrency: 2 }));
  } else {
    if (!['inspect', 'migrate', 'bootstrap'].includes(command)) throw new Error('Use inspect, migrate, bootstrap or benchmark.');
    db = createDatabase();
    if (command === 'inspect') console.info(JSON.stringify(await capabilities(db)));
    if (command === 'migrate') console.info(JSON.stringify(await migrate(db)));
    if (command === 'bootstrap') {
      if (process.env.NODE_ENV === 'production' || process.env.DB_CONFIRM_NAME !== process.env.DB_NAME) throw new Error('Explicit local development target confirmation required.');
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const username = await rl.question('Administrator username: ');
      const displayName = await rl.question('Display name: '); rl.close();
      const password = await hidden('Administrator password (hidden, 12–128 characters): ');
      const confirm = await hidden('Repeat password (hidden): ');
      if (password !== confirm) throw new Error('Passwords do not match.');
      const input = createInput.parse({ username, displayName, password, roles: ['administrator'], reason: 'Initial local bootstrap' });
      const id = await createIdentityService(db).bootstrap(input);
      console.info(JSON.stringify({ database: process.env.DB_NAME, administratorId: id, status: 'bootstrapped' }));
    }
  }
} catch {
  console.error('Identity command failed. Check the documented target, migration state, credentials and input. No credentials or SQL are logged.');
  process.exitCode = 1;
} finally { if (db) await db.destroy(); }
