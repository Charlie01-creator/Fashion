import multer from "multer";
import { Request } from "express";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Memory storage (not disk) — the buffer is handed straight to the
 * StorageProvider, which decides where it ultimately lands. Keeps multer
 * itself storage-agnostic.
 *
 * Security notes:
 * - fileFilter rejects by declared mimetype before the body is even fully
 *   read, which is a first line of defense but NOT sufficient on its own —
 *   a malicious client can lie about Content-Type. Real hardening (not done
 *   here, flagged for before production) would sniff the file's magic bytes
 *   server-side (e.g. `file-type` package) and re-encode/strip metadata
 *   (EXIF can carry GPS coordinates users didn't mean to share) via sharp.
 * - Size limit prevents trivial memory-exhaustion DoS via giant uploads.
 * - Exactly one file per request, one field name — narrows the attack surface
 *   vs. accepting arbitrary multipart fields.
 */
function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(AppError.badRequest("Only JPEG, PNG, and WebP images are allowed"));
    return;
  }
  cb(null, true);
}

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter,
}).single("image");
