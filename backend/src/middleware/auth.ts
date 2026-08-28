import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";

/**
 * Protects routes by requiring a valid access token in the Authorization
 * header: "Authorization: Bearer <token>".
 *
 * Deliberately does NOT read the token from a query string or the body —
 * tokens in URLs end up in server logs, browser history, and Referer
 * headers, which is a real leak vector.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw AppError.unauthorized("Invalid or expired access token");
  }
}
