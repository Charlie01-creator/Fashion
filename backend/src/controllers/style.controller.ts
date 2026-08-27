import { Request, Response } from "express";
import { ApiSuccess } from "@fashion-platform/shared";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { styleService } from "../services/style/style.service";

export const styleController = {
  generate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const profile = await styleService.generateProfile(req.user.sub);
    const body: ApiSuccess<typeof profile> = { success: true, data: profile, message: "Style profile generated" };
    res.status(201).json(body);
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const profile = await styleService.getProfile(req.user.sub);
    const body: ApiSuccess<typeof profile> = { success: true, data: profile };
    res.status(200).json(body);
  }),

  getPreferences: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const preferences = await styleService.getPreferences(req.user.sub);
    const body: ApiSuccess<typeof preferences> = { success: true, data: preferences };
    res.status(200).json(body);
  }),

  updatePreferences: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const preferences = await styleService.updatePreferences(req.user.sub, req.body);
    const body: ApiSuccess<typeof preferences> = {
      success: true,
      data: preferences,
      message: "Preferences updated",
    };
    res.status(200).json(body);
  }),
};
