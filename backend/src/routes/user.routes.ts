import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { updateProfileSchema } from "../validators/auth.validator";

const router = Router();

router.use(requireAuth); // every route below requires a valid access token

router.get("/me", userController.getMe);
router.patch("/me", validateBody(updateProfileSchema), userController.updateMe);

export default router;
