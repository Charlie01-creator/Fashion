import { ErrorCode, ErrorCodes } from "@fashion-platform/shared";

/**
 * Distinguishes "operational" errors (bad input, not found, unauthorized —
 * expected failure modes we handle gracefully) from programmer errors /
 * unexpected exceptions (which should be logged loudly and NOT leak
 * internals to the client). See errorHandler.ts for how this is used.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational = true;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: ErrorCode, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }
  static unauthorized(message = "Authentication required") {
    return new AppError(message, 401, ErrorCodes.UNAUTHORIZED);
  }
  static forbidden(message = "You do not have access to this resource") {
    return new AppError(message, 403, ErrorCodes.FORBIDDEN);
  }
  static notFound(message = "Resource not found") {
    return new AppError(message, 404, ErrorCodes.NOT_FOUND);
  }
  static conflict(message: string) {
    return new AppError(message, 409, ErrorCodes.CONFLICT);
  }
  static internal(message = "Something went wrong") {
    return new AppError(message, 500, ErrorCodes.INTERNAL_ERROR);
  }
}
