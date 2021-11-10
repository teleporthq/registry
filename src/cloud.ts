import { Storage } from "@google-cloud/storage";
import { FileTypes } from "./types";
import { CACHE_CONTROL } from "./utils";

class GoogleCloud {
  private bucket: any;

  constructor() {
    const storage = new Storage();
    this.bucket = storage.bucket(process.env.BUCKET_NAME);
  }

  public async isFileExists(fileName: string) {
    const file = this.bucket.file(fileName);
    try {
      const exists = await file.exists();
      if (!exists[0]) {
        return false;
      }
      return file;
    } catch (e) {
      return false;
    }
  }

  public async uploadFile(content: Buffer, fileName: string, type: FileTypes) {
    try {
      const file = this.bucket.file(fileName);

      await file.save(content, {
        metadata: {
          gzip: true,
          contentType: type,
          cacheControl: CACHE_CONTROL,
        },
        resumable: false,
      });
      return file;
    } catch (e) {
      console.error(e);
      throw Error("Something went wrong");
    }
  }
}

export const gcloud = Object.freeze(new GoogleCloud());
