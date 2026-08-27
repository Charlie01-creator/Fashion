/**
 * Storage abstraction so the rest of the app never talks to "disk" or "S3"
 * directly — it talks to this interface. Swapping providers (e.g. going
 * from local disk in dev to S3 in production) means writing one new class
 * and flipping an env var, not touching controllers/services/routes.
 */
export interface UploadResult {
  /** Internal key used to reference/delete the file later. Never expose raw filesystem paths to the client. */
  key: string;
  /** Publicly resolvable URL for displaying the image. */
  url: string;
}

export interface StorageProvider {
  /**
   * Persist a file and return its key + public URL.
   * @param ownerId - used to namespace storage per-user (e.g. `users/{ownerId}/...`),
   *   which keeps user data logically separated even in a shared bucket.
   */
  upload(ownerId: string, buffer: Buffer, mimeType: string): Promise<UploadResult>;

  /** Permanently remove a previously uploaded file. Should be idempotent (no error if already gone). */
  delete(key: string): Promise<void>;
}
