import nodemailer from "nodemailer";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { Socket } from "node:net";
import { categories, isEmail } from "./validation.js";

export function buildMessage(r, reference, smtp) {
  return {
    from: { name: "Unique Plastic Industry", address: smtp.from },
    to: { name: "Unique Plastic Industry inquiries", address: smtp.recipient },
    replyTo: { address: r.email },
    subject: `Unique Plastic Industry packaging inquiry [${reference}]`,
    text: `Unique Plastic Industry — packaging inquiry\nReference: ${reference}\nCustomer: ${r.customerName}\nCompany: ${r.companyName}\nEmail: ${r.email}\nPhone: ${r.phone}\nCategory: ${categories[r.productCategory]}\nApproximate quantity: ${r.quantity}\nCapacity / size: ${r.capacity}\n\nCustomer's plain-text message:\n${r.message}`,
  };
}
export function createDelivery(
  config,
  transportFactory = nodemailer.createTransport,
) {
  return async (request, reference, signal) => {
    const smtp = config.smtp;
    if (config.mode === "DevelopmentFile" && config.development) {
      await mkdir(config.outbox, { recursive: true, mode: 0o700 });
      const temporary = join(config.outbox, `${reference}.tmp`);
      try {
        const file = await open(temporary, "wx", 0o600);
        try {
          await file.writeFile(buildMessage(request, reference, smtp).text, {
            signal,
          });
          await file.sync();
        } finally {
          await file.close();
        }
        signal.throwIfAborted();
        await rename(temporary, join(config.outbox, `${reference}.txt`));
      } finally {
        await rm(temporary, { force: true });
      }
      return "DevelopmentSaved";
    }
    if (
      config.mode !== "Smtp" ||
      !smtp.host ||
      /\s/.test(smtp.host) ||
      !["StartTls", "SslOnConnect"].includes(smtp.tlsMode) ||
      !smtp.user ||
      !smtp.pass ||
      !isEmail(smtp.from) ||
      !isEmail(smtp.recipient)
    )
      return "Unavailable";
    // Own the documented caller-supplied socket so cancellation closes in-flight SMTP,
    // including STARTTLS's underlying connection. Transport.close alone only releases auth resources.
    const socket = new Socket();
    socket.on("error", () => {}); // cancellation may precede Nodemailer's listener setup
    const transport = transportFactory({
      socket,
      host: smtp.host,
      port: smtp.port,
      secure: smtp.tlsMode === "SslOnConnect",
      requireTLS: true,
      auth: { user: smtp.user, pass: smtp.pass },
      connectionTimeout: config.timeoutMs,
      greetingTimeout: config.timeoutMs,
      socketTimeout: config.timeoutMs,
      logger: false,
      debug: false,
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    const abort = () => {
      socket.destroy(new Error("Delivery canceled."));
      try {
        transport.close();
      } catch {
        /* cancellation remains uncertain */
      }
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      signal.throwIfAborted();
      const result = await transport.sendMail(
        buildMessage(request, reference, smtp),
      );
      return result.accepted?.length ? "SmtpAccepted" : "Rejected";
    } catch (error) {
      if (error.responseCode >= 400 && error.responseCode <= 599)
        return "Rejected";
      if (
        ["EAUTH", "EDNS", "ECONNECTION"].includes(error.code) ||
        ["CONN", "AUTH"].includes(error.command)
      )
        return "Unavailable";
      return "Unknown";
    } finally {
      signal.removeEventListener("abort", abort);
      socket.destroy();
      try {
        transport.close();
      } catch {
        /* confirmed acceptance cannot be undone by disconnect */
      }
    }
  };
}
