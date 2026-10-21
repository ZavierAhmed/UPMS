import { createApp } from "./app.js";
const stopping = new AbortController();
try {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid PORT.");
  const app = createApp({
    shutdownSignal: stopping.signal,
    log: (event) => console.info(JSON.stringify(event)),
  });
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
      server.close(() => {
        process.exitCode = 0;
      });
      server.closeIdleConnections();
      setTimeout(() => {
        server.closeAllConnections();
      }, 5000).unref();
    });
} catch {
  console.error(
    "UPMS startup failed. Check the build, explicit ALLOWED_HOSTS, PUBLIC_ORIGIN and environment configuration.",
  );
  process.exitCode = 1;
}
