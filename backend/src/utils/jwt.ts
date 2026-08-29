import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  // @types/jsonwebtoken narrows `expiresIn` to a branded string type (e.g.
  // "15m", "30d") rather than plain `string`, specifically to catch typos in
  // duration strings at compile time. env.JWT_ACCESS_EXPIRY is validated at
  // startup (config/env.ts) to be a real duration string, so this cast is
  // safe — it's satisfying the stricter compile-time type, not bypassing a
  // real runtime check.
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Refresh tokens are opaque random strings, NOT JWTs. We store a hash of
 * the token server-side (RefreshToken table) so a leaked DB doesn't hand an
 * attacker usable tokens, and so we can revoke individual sessions.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiryDate(): Date {
  const days = parseInt(env.JWT_REFRESH_EXPIRY.replace("d", ""), 10) || 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
