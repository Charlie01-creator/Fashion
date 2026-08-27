import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { registerSchema, loginSchema } from "../validators/auth.validator";

const router = Router();

// Brute-force / credential-stuffing mitigation. Tune per your traffic —
// this is deliberately generous for a portfolio/MVP stage.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts, try again later" } },
});

// Refresh is called silently on every page load (see frontend AuthProvider),
// so it needs a much higher ceiling than login/register, but an unlimited
// endpoint that accepts a client-supplied token is still worth capping —
// this stops a leaked/guessed token from being hammered, and caps the
// blast radius of a buggy frontend refresh loop.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts, try again later" } },
});

router.post("/register", authLimiter, validateBody(registerSchema), authController.register);
router.post("/login", authLimiter, validateBody(loginSchema), authController.login);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", refreshLimiter, authController.logout);

export default router;
