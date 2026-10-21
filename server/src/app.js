import express from "express";
import compression from "compression";
import { loadConfig } from "./config/index.js";
import { security } from "./middleware/security.js";
import { createDelivery } from "./inquiries/delivery.js";
import { createSubmissions } from "./inquiries/submissions.js";
import { inquiryApi } from "./inquiries/api.js";
import { website } from "./website/index.js";
import { identityConfig } from "./identity/config.js";
import { createDatabase } from "./identity/database.js";
import { managementRouter } from "./identity/router.js";

export function createApp({
  config = loadConfig(),
  delivery = createDelivery(config),
  log = () => {},
  now,
  shutdownSignal,
  management = identityConfig(),
  identityDatabase,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.disable("etag");
  app.set("trust proxy", false);
  app.use(security(config));
  if (management) {
    const db = identityDatabase || createDatabase({ ...process.env, IDENTITY_DB_PURPOSE: 'runtime' });
    app.locals.identityDatabase = db;
    app.use(managementRouter(db, management));
  }
  app.use(
    inquiryApi(
      config,
      createSubmissions(config, delivery, { now, log, shutdownSignal }),
      now,
    ),
  );
  app.use(
    compression({
      filter: (req, res) =>
        !/^\/api(?:\/|$)/i.test(req.path) && compression.filter(req, res),
    }),
  );
  // Preserve the pre-existing template endpoint for compatibility; unrelated to sales features.
  app.get("/weatherforecast", (req, res) => {
    if (req.method !== "GET") return res.status(404).end();
    return res.json(
      Array.from({ length: 5 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index + 1);
        const temperatureC = Math.floor(Math.random() * 75) - 20;
        return {
          date: date.toISOString().slice(0, 10),
          temperatureC,
          temperatureF: 32 + Math.trunc(temperatureC / 0.5556),
          summary: [
            "Freezing",
            "Bracing",
            "Chilly",
            "Cool",
            "Mild",
            "Warm",
            "Balmy",
            "Hot",
            "Sweltering",
            "Scorching",
          ][Math.floor(Math.random() * 10)],
        };
      }),
    );
  });
  app.use(website(config));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    res
      .status(err.status === 400 ? 400 : 500)
      .type("text")
      .send("The request could not be completed.");
  });
  return app;
}
