import { createApp } from "./app.js";
import {assertSupportedRuntime} from './production/runtime.js';
import {createBlockedPreview} from './godaddy/preview.js';
import {assertDatabaseProfile} from './godaddy/policy.js';
const stopping = new AbortController();
let startupDatabase;
try {
  assertSupportedRuntime();
  if(process.env.UPMS_HOSTING_PROFILE&&process.env.UPMS_HOSTING_PROFILE!=='godaddy-preview-blocked')throw new Error('Unknown hosting profile');
  if(process.env.UPMS_HOSTING_PROFILE!=='godaddy-preview-blocked')assertDatabaseProfile();
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PORT.");
  const app = process.env.UPMS_HOSTING_PROFILE==='godaddy-preview-blocked'?createBlockedPreview():createApp({
    shutdownSignal: stopping.signal,
    log: (event) => console.info(JSON.stringify(event)),
  });
  startupDatabase = app.locals.identityDatabase;
  if (startupDatabase) await startupDatabase.raw('SELECT 1');
  const server = app.listen(port, "0.0.0.0", () =>
    console.info(`UPMS listening on port ${port}`),
  );
  server.requestTimeout = 35000;
  server.headersTimeout = 10000;
  server.on("error", () => {
    console.error(
      "UPMS listener failed. Check PORT and platform configuration.",
    );
    process.exitCode = 1;
  });
  let closing = false;
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      if (closing) return;
      closing = true;
      stopping.abort();
      server.close(async () => {
        try { await app.locals.identityDatabase?.destroy(); }
        catch { process.exitCode = 1; return; }
        process.exitCode = 0;
      });
      server.closeIdleConnections();
      setTimeout(() => {
        server.closeAllConnections();
      }, 5000).unref();
    });
} catch {
  await startupDatabase?.destroy();
  console.error(
    "UPMS startup failed. Check the build, explicit ALLOWED_HOSTS, PUBLIC_ORIGIN and environment configuration.",
  );
  process.exitCode = 1;
}
