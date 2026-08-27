import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { AppError } from "../utils/AppError";

/**
 * Validates req.body against a zod schema before it reaches the controller.
 * Controllers can then trust req.body's shape completely — no defensive
 * checks scattered through business logic.
 */
export function validateBody(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw AppError.badRequest("Validation failed", err.flatten().fieldErrors);
      }
      throw err;
    }
  };
}

/** Same idea as validateBody, for query string params (e.g. list filters/pagination). */
export function validateQuery(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Express's req.query is technically read-only in types but writable at runtime;
      // reassigning gives downstream handlers the coerced/typed values (numbers, not strings).
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw AppError.badRequest("Invalid query parameters", err.flatten().fieldErrors);
      }
      throw err;
    }
  };
}
