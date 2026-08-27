import { Router } from "express";
import rateLimit from "express-rate-limit";
import { outfitController } from "../controllers/outfit.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { generateOutfitSchema, listOutfitsQuerySchema } from "../validators/outfit.validator";
import { submitFeedbackSchema } from "../validators/style.validator";

const router = Router();

router.use(requireAuth); // every outfit route requires a valid access token

// Generation does real work (fetches the whole wardrobe, runs the engine,
// writes several rows per call) — a tighter limit than plain reads guards
// against a user (or bug) hammering "Generate" in a loop.
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many outfit generations, try again later" },
  },
});

router.post("/generate", generateLimiter, validateBody(generateOutfitSchema), outfitController.generate);
router.get("/", validateQuery(listOutfitsQuerySchema), outfitController.list);
router.get("/:id", outfitController.getById);
router.post("/:id/feedback", validateBody(submitFeedbackSchema), outfitController.submitFeedback);
router.delete("/:id", outfitController.remove);

export default router;
