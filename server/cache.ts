import { Storage, Bucket, File } from "@google-cloud/storage";
import zlib from "zlib";
import { bucketName, GCLOUD_CONSTANTS } from "./config";

// Should we maintain a in memory cache ??
// Is it still valid to use lru-cache for that
// To save trips from gcloud
class Cache {
  private bucket: Bucket;

  constructor() {
    const storage = new Storage();
    this.bucket = storage.bucket(bucketName);
  }

  async has(packageName: string): Promise<[boolean, File?]> {
    const file = this.bucket.file(`${packageName}.js`);
    try {
      const result = await file.exists();
      if (result[0]) {
        return [true, file];
      }
    } catch (e) {
      return [false];
    }
    return [false];
  }

  async get(file: File): Promise<Buffer> {
    const cachedFile = await file.download();
    // @ts-ignore
    return zlib.gzipSync(cachedFile.toString("utf-8", 0, 12));
  }

  async set(hash: string, bundle: string) {
    const file = this.bucket.file(`${hash}.js`);
    await file.save(Buffer.from(bundle), {
      metadata: {
        contentType: GCLOUD_CONSTANTS.APPLICATION_TYPE,
        cacheControl: GCLOUD_CONSTANTS.CACHE_CONTROL,
      },
    });
    return;
  }
}

const cache = new Cache();
export default Object.freeze(cache);
