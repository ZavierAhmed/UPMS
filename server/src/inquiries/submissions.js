import { createHash, randomUUID } from "node:crypto";

export function createSubmissions(
  config,
  delivery,
  { now = Date.now, log = () => {}, shutdownSignal } = {},
) {
  const entries = new Map();
  return function submit(key, request) {
    const time = now();
    for (const [k, entry] of entries)
      if (entry.done && entry.expires <= time) entries.delete(k);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(request))
      .digest("hex");
    const previous = entries.get(key);
    if (previous)
      return previous.fingerprint === fingerprint
        ? { work: previous.work }
        : { error: "idempotency_conflict" };
    if (entries.size >= 1000) return { error: "busy" };
    const entry = { fingerprint, expires: time + 1800000, done: false };
    entries.set(key, entry);
    entry.work = (async () => {
      const reference = randomUUID().replaceAll("-", "");
      const controller = new AbortController();
      const stop = () => controller.abort();
      shutdownSignal?.addEventListener("abort", stop, { once: true });
      let timer;
      let outcome;
      try {
        const aborted = new Promise((resolve) => {
          controller.signal.addEventListener(
            "abort",
            () => resolve("Unknown"),
            { once: true },
          );
          timer = setTimeout(stop, config.timeoutMs);
          if (shutdownSignal?.aborted) stop();
        });
        outcome = await Promise.race([
          Promise.resolve().then(() =>
            delivery(request, reference, controller.signal),
          ),
          aborted,
        ]);
      } catch {
        outcome = "Unknown";
      } finally {
        clearTimeout(timer);
        shutdownSignal?.removeEventListener("abort", stop);
        entry.done = true;
      }
      log({ event: "Inquiry handoff", outcome, reference });
      return { reference, outcome };
    })();
    return { work: entry.work };
  };
}
