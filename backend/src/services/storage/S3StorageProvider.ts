import crypto from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { StorageProvider, UploadResult } from "./StorageProvider";
import { env } from "../../config/env";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * S3-API-compatible storage. Works unmodified with Cloudflare R2, AWS S3,
 * Backblaze B2, MinIO, or anything else speaking the S3 API — only
 * S3_ENDPOINT/S3_REGION change between providers, which live entirely in
 * env vars, not code.
 *
 * Mirrors LocalStorageProvider's key scheme exactly (users/{ownerId}/{uuid}.{ext})
 * so switching STORAGE_DRIVER doesn't change how keys look or how the rest
 * of the app reasons about them — only where the bytes actually live.
 *
 * Object visibility: uploaded objects are written as publicly-readable
 * (via S3_PUBLIC_URL, e.g. an R2 public bucket URL or a CDN domain in
 * front of the bucket) — same trust model LocalStorageProvider already
 * documented (guessable-UUID-as-access-control, not a private/signed-URL
 * scheme). If wardrobe photos need to be properly private later, that's a
 * bigger change (signed GET URLs, no public bucket) — out of scope here,
 * this fix specifically addresses durability, not access control.
 */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    // env's .refine() guarantees these are all set when STORAGE_DRIVER=s3 —
    // the non-null assertions here reflect that already-enforced invariant,
    // not an unchecked assumption.
    this.bucket = env.S3_BUCKET!;
    this.publicUrl = env.S3_PUBLIC_URL!.replace(/\/$/, "");
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }

  async upload(ownerId: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    const ext = EXTENSION_BY_MIME[mimeType];
    if (!ext) {
      throw new Error(`Unsupported mime type: ${mimeType}`);
    }

    // Same scheme as LocalStorageProvider: namespaced by owner, random
    // filename — no user input in the key, so no path-traversal surface,
    // and no collisions/overwrites.
    const filename = `${crypto.randomUUID()}.${ext}`;
    const key = `users/${ownerId}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        // Server-set content type + fixed extension from our own mapping
        // (never the client's filename) — same defense against a spoofed
        // Content-Type header being trusted at the point where it matters
        // (what gets served back later) as LocalStorageProvider has.
      })
    );

    return { key, url: `${this.publicUrl}/${key}` };
  }

  async delete(key: string): Promise<void> {
    // Reject anything that isn't our own key shape before it ever reaches
    // the network call — mirrors LocalStorageProvider's path-escape guard,
    // adapted for an object-key (not filesystem-path) namespace.
    if (!key.startsWith("users/") || key.includes("..")) {
      throw new Error("Invalid storage key");
    }

    // S3's DeleteObject is a no-op success even for an already-missing key
    // (unlike fs.unlink, which throws a distinguishable ENOENT) — so this
    // call is idempotent by the API's own contract, no special-case
    // "already gone" handling needed the way LocalStorageProvider requires.
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
