import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import clothingRoutes from "./clothing.routes";
import outfitRoutes from "./outfit.routes";
import styleRoutes from "./style.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clothing", clothingRoutes);
router.use("/outfits", outfitRoutes);
router.use("/style-profile", styleRoutes);

export default router;
