import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { StorageProvider, UploadResult } from "./StorageProvider";
import { env } from "../../config/env";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Local-disk implementation, for development only.
 *
 * IMPORTANT — not production-durable: most PaaS platforms (Render, Fly,
 * Heroku-style deploys, etc.) use ephemeral filesystems, so anything
 * written here is lost on redeploy/restart. Swap to S3StorageProvider
 * (or equivalent) before shipping — same interface, so nothing else in
 * the app needs to change. See docs/ARCHITECTURE.md.
 *
 * Also note: files served from this provider are PUBLIC to anyone who
 * guesses/obtains the URL (random UUID filenames, but no access control).
 * A real deployment should use a private bucket + short-lived signed GET
 * URLs if wardrobe photos should not be publicly listable.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly rootDir = path.resolve(process.cwd(), env.UPLOAD_DIR);

  async upload(ownerId: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    const ext = EXTENSION_BY_MIME[mimeType];
    if (!ext) {
      throw new Error(`Unsupported mime type: ${mimeType}`);
    }

    // Namespaced by owner, random filename — prevents path traversal
    // (no user input in the path) and prevents filename collisions/overwrites.
    const filename = `${crypto.randomUUID()}.${ext}`;
    const relativeDir = path.join("users", ownerId);
    const absoluteDir = path.join(this.rootDir, relativeDir);

    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(path.join(absoluteDir, filename), buffer);

    const key = path.posix.join(relativeDir, filename);
    return { key, url: `${env.PUBLIC_UPLOAD_URL}/${key}` };
  }

  async delete(key: string): Promise<void> {
    // Guard against a key that escapes rootDir (e.g. "../../etc/passwd")
    // before touching the filesystem.
    const resolved = path.resolve(this.rootDir, key);
    if (!resolved.startsWith(this.rootDir)) {
      throw new Error("Invalid storage key");
    }

    try {
      await fs.unlink(resolved);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err; // idempotent delete — already gone is fine
    }
  }
}
