import { Request, Response } from "express";
import { ApiSuccess } from "@fashion-platform/shared";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { outfitService } from "../services/outfits/outfit.service";
import type { ListOutfitsQuery } from "../validators/outfit.validator";

export const outfitController = {
  generate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await outfitService.generate(req.user.sub, req.body);
    const body: ApiSuccess<typeof result> = {
      success: true,
      data: result,
      message: `Generated ${result.outfits.length} outfit${result.outfits.length === 1 ? "" : "s"}`,
    };
    res.status(201).json(body);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { page, limit } = req.query as unknown as ListOutfitsQuery;
    const result = await outfitService.list(req.user.sub, page, limit);
    const body: ApiSuccess<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const outfit = await outfitService.getById(req.user.sub, req.params.id);
    const body: ApiSuccess<typeof outfit> = { success: true, data: outfit };
    res.status(200).json(body);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await outfitService.delete(req.user.sub, req.params.id);
    const body: ApiSuccess<null> = { success: true, data: null, message: "Outfit removed" };
    res.status(200).json(body);
  }),

  submitFeedback: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const outfit = await outfitService.submitFeedback(req.user.sub, req.params.id, req.body.action);
    const body: ApiSuccess<typeof outfit> = { success: true, data: outfit };
    res.status(200).json(body);
  }),
};
