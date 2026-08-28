import { Request, Response } from "express";
import { ApiSuccess } from "@fashion-platform/shared";
import { asyncHandler } from "../utils/asyncHandler";
import { userService } from "../services/user.service";
import { AppError } from "../utils/AppError";

export const userController = {
  getMe: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const profile = await userService.getProfile(req.user.sub);
    const body: ApiSuccess<typeof profile> = { success: true, data: profile };
    res.status(200).json(body);
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const updated = await userService.updateProfile(req.user.sub, req.body);
    const body: ApiSuccess<typeof updated> = { success: true, data: updated, message: "Profile updated" };
    res.status(200).json(body);
  }),
};
