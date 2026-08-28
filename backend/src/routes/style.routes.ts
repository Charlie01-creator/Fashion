import { Router } from "express";
import rateLimit from "express-rate-limit";
import { styleController } from "../controllers/style.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { updateFashionPreferenceSchema } from "../validators/style.validator";

const router = Router();

router.use(requireAuth);

// Generation reads the user's whole wardrobe + outfit history — cheap for
// one user on demand, but still worth throttling against accidental or
// scripted repeated calls the same way outfit generation is.
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many style profile generations, try again later" },
  },
});

router.post("/generate", generateLimiter, styleController.generate);
router.get("/", styleController.getProfile);
router.get("/preferences", styleController.getPreferences);
router.patch("/preferences", validateBody(updateFashionPreferenceSchema), styleController.updatePreferences);

export default router;
