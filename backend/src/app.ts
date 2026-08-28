import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { env } from "./config/env";
import apiRouter from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { logger } from "./config/logger";

export function createApp(): Express {
  const app = express();

  // Behind a reverse proxy (Render, Fly, nginx, ALB) in production —
  // needed for secure cookies and rate-limiting to see the real client IP.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // Default helmet policy is "same-origin", which blocks the browser
      // from loading /uploads images (and any other response from this
      // API) when the requesting page is on a different origin — exactly
      // the deployment shape here (Vercel frontend, Render/Railway API).
      // This API has no cookie-authenticated HTML pages of its own to
      // protect from being framed/read cross-origin, so relaxing this is
      // safe; it only affects how *other* origins may embed our responses.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      // env.CLIENT_ORIGIN is an array (comma-separated list, parsed in
      // config/env.ts) so both local dev and multiple production frontend
      // origins (e.g. a Vercel preview URL alongside the main domain) work
      // without code changes.
      origin(requestOrigin, callback) {
        // No Origin header = same-origin request, curl/server-to-server call,
        // or a health check — not a browser cross-origin request, so there's
        // nothing to validate against the allowlist.
        if (!requestOrigin || env.CLIENT_ORIGIN.includes(requestOrigin)) {
          callback(null, true);
          return;
        }
        logger.warn("CORS rejected request from disallowed origin", { origin: requestOrigin });
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true, // required so the httpOnly refresh cookie is sent
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  // Serves locally-stored images in dev. In production (STORAGE_DRIVER=s3),
  // this directory won't exist/be used — images are served from the
  // cloud storage provider's own URL instead. See docs/ARCHITECTURE.md
  // re: this being public/unauthenticated by design at this stage.
  app.use(
    "/uploads",
    express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
      maxAge: "1d",
      // Never allow directory listing or serving files outside the uploads root.
      dotfiles: "deny",
      index: false,
    })
  );

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler); // must be registered last

  return app;
}
