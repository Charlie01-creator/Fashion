import { Request, Response } from "express";
import { ApiSuccess } from "@fashion-platform/shared";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { clothingService } from "../services/clothing.service";
import { storageProvider } from "../services/storage";
import type { ListClothingQuery } from "../validators/clothing.validator";

export const clothingController = {
  /**
   * POST /api/clothing/upload — accepts one multipart image, stores it via
   * the storage provider, returns {url, key}. This is a separate step from
   * creating the ClothingItem record so the frontend can preview/confirm
   * metadata before committing, and so a failed metadata submission doesn't
   * require re-uploading the image.
   */
  upload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    if (!req.file) throw AppError.badRequest("No image file provided (field name: 'image')");

    const result = await storageProvider.upload(req.user.sub, req.file.buffer, req.file.mimetype);

    const body: ApiSuccess<typeof result> = { success: true, data: result };
    res.status(201).json(body);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const item = await clothingService.create(req.user.sub, req.body);
    const body: ApiSuccess<typeof item> = { success: true, data: item, message: "Item added to wardrobe" };
    res.status(201).json(body);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await clothingService.list(req.user.sub, req.query as unknown as ListClothingQuery);
    const body: ApiSuccess<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const item = await clothingService.getById(req.user.sub, req.params.id);
    const body: ApiSuccess<typeof item> = { success: true, data: item };
    res.status(200).json(body);
  }),

  /**
   * POST /api/clothing/:id/analyze — re-runs AI analysis for an item whose
   * previous attempt failed (or to refresh a completed one). Synchronous
   * (awaited) here, unlike the fire-and-forget call in create(), because
   * the user explicitly asked for this and is looking at a "retry" button —
   * they're expecting to wait for the result, not get an instant response
   * that silently updates in the background.
   */
  reanalyze: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const item = await clothingService.analyzeItem(req.user.sub, req.params.id);
    const body: ApiSuccess<typeof item> = { success: true, data: item };
    res.status(200).json(body);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await clothingService.delete(req.user.sub, req.params.id);
    const body: ApiSuccess<null> = { success: true, data: null, message: "Item removed from wardrobe" };
    res.status(200).json(body);
  }),
};
