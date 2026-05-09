import express from "express";
import type { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Application = express();
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

const IS_PROD = process.env.NODE_ENV === "production";

let corsOrigin: string[] | boolean;
if (process.env.ALLOWED_ORIGIN) {
  corsOrigin = process.env.ALLOWED_ORIGIN.split(",").map((o) => o.trim());
} else if (IS_PROD) {
  const origins: string[] = [];
  if (process.env.REPLIT_DOMAINS) {
    origins.push(...process.env.REPLIT_DOMAINS.split(",").map((d) => `https://${d.trim()}`));
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  corsOrigin = origins.length > 0 ? origins : false;
} else {
  corsOrigin = true;
}

app.use(cors({ credentials: true, origin: corsOrigin }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);
export default app;
