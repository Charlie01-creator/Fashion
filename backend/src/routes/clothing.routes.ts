import { Router } from "express";
import rateLimit from "express-rate-limit";
import { clothingController } from "../controllers/clothing.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { uploadImage } from "../middleware/upload";
import { createClothingItemSchema, listClothingQuerySchema } from "../validators/clothing.validator";

const router = Router();

router.use(requireAuth); // every clothing route requires a valid access token

// Uploads are more expensive (disk/network I/O, larger payloads) than typical
// API calls — a tighter limiter than the general API guards against someone
// hammering storage or filling disk quota.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many uploads, try again later" } },
});

router.post("/upload", uploadLimiter, uploadImage, clothingController.upload);
router.post("/", validateBody(createClothingItemSchema), clothingController.create);
router.get("/", validateQuery(listClothingQuerySchema), clothingController.list);
router.get("/:id", clothingController.getById);

// AI calls cost money/compute per request (even the mock simulates this) —
// a tighter limiter than general API traffic prevents a "retry" button
// from being hammered into an expensive loop.
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many analysis requests, try again later" },
  },
});
router.post("/:id/analyze", analyzeLimiter, clothingController.reanalyze);

router.delete("/:id", clothingController.remove);

export default router;
