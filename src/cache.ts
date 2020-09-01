import { Storage, Bucket, File } from "@google-cloud/storage";
import zlib from "zlib";
import { bucketName, GCLOUD_CONSTANTS } from "./config";
import { removeIllegalCharacters } from "./utils/helper";

// Should we maintain a in memory cache ??
// Is it still valid to use lru-cache for that
// To save trips from gcloud
class Cache {
  private bucket: Bucket;

  constructor() {
    const storage = new Storage();
    this.bucket = storage.bucket(bucketName);
  }

  async has(
    packageName: string,
    folder: string,
    version: string,
    identifier = "npm"
  ): Promise<[boolean, File?]> {
    const file = this.bucket.file(
      `${identifier}/${removeIllegalCharacters(
        folder
      )}/${version}/${packageName}`
    );
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

  async set(
    packageName: string,
    bundle: string,
    folder: string,
    version: string,
    identifier = "npm"
  ) {
    const file = this.bucket.file(
      `${identifier}/${removeIllegalCharacters(
        folder
      )}/${version}/${packageName}`
    );
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
