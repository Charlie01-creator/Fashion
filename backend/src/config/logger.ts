import winston from "winston";
import { env, isProduction } from "./env";

/**
 * Structured logging so that in production these lines can be shipped to
 * something like Datadog/CloudWatch and queried, instead of grepping
 * plain-text console output.
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isProduction
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      ),
  transports: [new winston.transports.Console()],
  // Never let a logging failure crash the process, but also never
  // silently lose exceptions — log them and let the process exit naturally.
  exitOnError: false,
});
