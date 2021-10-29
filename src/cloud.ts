import { Storage } from "@google-cloud/storage";
import { CACHE_CONTROL, APPLICATION_TYPE, config } from "./constants";

class GoogleCloud {
  private bucket: any;

  constructor() {
    const storage = new Storage();
    this.bucket = storage.bucket(config.bucketName);
  }

  public async fetchPackage(pacakgeName: string) {
    const file = this.bucket.file(pacakgeName);
    try {
      const exists = await file.exists();
      if (!exists[0]) {
        return;
      }
      const content = await file.download();
      return JSON.parse(content);
    } catch (e) {
      console.error(e);
      throw Error("Something went wrong");
    }
  }

  public async uploadPackage(packageContent: string, pacakgeName: string) {
    try {
      const file = this.bucket.file(pacakgeName);

      const bufferStream = Buffer.from(packageContent);
      await file.save(bufferStream, {
        metadata: {
          gzip: true,
          contentType: APPLICATION_TYPE,
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

export default GoogleCloud;
