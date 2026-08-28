import { NextFunction, Request, Response } from "express";
import { ApiError, ErrorCodes } from "@fashion-platform/shared";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { isProduction } from "../config/env";

/**
 * Single place all errors funnel through. Rules:
 * 1. Known/operational errors (AppError) -> return their exact status/message.
 * 2. Known Prisma errors -> translate to safe, specific messages.
 * 3. Anything else -> log full detail server-side, return a generic 500
 *    to the client. We never leak stack traces or internal error messages
 *    to the client in production — that's an information-disclosure risk.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { code: err.code, stack: err.stack, path: req.path });
    } else {
      logger.warn(err.message, { code: err.code, path: req.path });
    }

    const body: ApiError = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof multer.MulterError) {
    logger.warn("Upload rejected", { code: err.code, path: req.path });
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "Image exceeds the maximum allowed size" : "Upload failed";
    const body: ApiError = { success: false, error: { code: ErrorCodes.VALIDATION_ERROR, message } };
    res.status(400).json(body);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn("Prisma known error", { code: err.code, path: req.path });

    if (err.code === "P2002") {
      const body: ApiError = {
        success: false,
        error: { code: ErrorCodes.CONFLICT, message: "A record with these details already exists" },
      };
      res.status(409).json(body);
      return;
    }
    if (err.code === "P2025") {
      const body: ApiError = {
        success: false,
        error: { code: ErrorCodes.NOT_FOUND, message: "Resource not found" },
      };
      res.status(404).json(body);
      return;
    }
  }

  // Unknown / unexpected error — log full detail, never leak it.
  logger.error("Unhandled error", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    path: req.path,
  });

  const body: ApiError = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: isProduction ? "An unexpected error occurred" : String(err),
    },
  };
  res.status(500).json(body);
}

/** Catches requests to routes that don't exist. Mount this after all routes. */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiError = {
    success: false,
    error: { code: ErrorCodes.NOT_FOUND, message: `Route ${req.method} ${req.path} not found` },
  };
  res.status(404).json(body);
}
