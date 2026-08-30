import { StorageProvider } from "./StorageProvider";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { S3StorageProvider } from "./S3StorageProvider";
import { env } from "../../config/env";

/**
 * Single point of truth for "which storage backend are we using". Everything
 * else in the app imports `storageProvider` from here and never instantiates
 * a provider directly.
 */
function createStorageProvider(): StorageProvider {
  switch (env.STORAGE_DRIVER) {
    case "local":
      return new LocalStorageProvider();
    case "s3":
      return new S3StorageProvider();
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
}

export const storageProvider = createStorageProvider();
export type { StorageProvider, UploadResult } from "./StorageProvider";
