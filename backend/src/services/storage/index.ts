import { StorageProvider } from "./StorageProvider";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { env } from "../../config/env";

/**
 * Single point of truth for "which storage backend are we using". Everything
 * else in the app imports `storageProvider` from here and never instantiates
 * a provider directly.
 *
 * To add S3: implement `S3StorageProvider implements StorageProvider` (using
 * @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner), add `case "s3":` below.
 * No other file in the codebase changes.
 */
function createStorageProvider(): StorageProvider {
  switch (env.STORAGE_DRIVER) {
    case "local":
      return new LocalStorageProvider();
    // case "s3": return new S3StorageProvider();
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
}

export const storageProvider = createStorageProvider();
export type { StorageProvider, UploadResult } from "./StorageProvider";
