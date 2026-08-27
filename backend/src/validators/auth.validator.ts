import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  // Deliberately not requiring symbols/numbers by regex — that pushes users
  // toward predictable substitutions ("P@ssw0rd1"). Length is a stronger
  // real-world signal of strength. NIST 800-63B agrees.
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  stylePreferences: z.array(z.string()).max(50).optional(),
  favouriteColors: z.array(z.string()).max(50).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
