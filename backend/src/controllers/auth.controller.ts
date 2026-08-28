import { Request, Response } from "express";
import { ApiSuccess, AuthResponse } from "@fashion-platform/shared";
import { asyncHandler } from "../utils/asyncHandler";
import { authService } from "../services/auth.service";
import { AppError } from "../utils/AppError";
import { cookieConfig } from "../config/env";

const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: cookieConfig.secure,
  sameSite: cookieConfig.sameSite,
  domain: cookieConfig.domain,
  path: "/api/auth", // scoped narrowly so it's only sent on auth endpoints
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
// clearCookie must be called with the same attributes used to set the
// cookie (minus maxAge/expires) or the browser treats it as a different
// cookie and won't remove the original — this went stale before as a
// separately-maintained `{ path: "/api/auth" }` literal in `logout` below.
const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: cookieConfig.secure,
  sameSite: cookieConfig.sameSite,
  domain: cookieConfig.domain,
  path: "/api/auth",
};

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.register(req.body);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    const body: ApiSuccess<AuthResponse> = {
      success: true,
      data: { user, tokens: { accessToken: tokens.accessToken } },
      message: "Account created successfully",
    };
    res.status(201).json(body);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.login(req.body);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    const body: ApiSuccess<AuthResponse> = {
      success: true,
      data: { user, tokens: { accessToken: tokens.accessToken } },
    };
    res.status(200).json(body);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    if (!rawToken) throw AppError.unauthorized("No refresh token provided");

    const { user, tokens } = await authService.refresh(rawToken);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    const body: ApiSuccess<AuthResponse> = {
      success: true,
      data: { user, tokens: { accessToken: tokens.accessToken } },
    };
    res.status(200).json(body);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const rawToken = req.cookies?.[REFRESH_COOKIE];
    if (rawToken) await authService.logout(rawToken);

    res.clearCookie(REFRESH_COOKIE, CLEAR_COOKIE_OPTIONS);
    const body: ApiSuccess<null> = { success: true, data: null, message: "Logged out" };
    res.status(200).json(body);
  }),
};
