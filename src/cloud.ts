import { Storage } from "@google-cloud/storage";
import { transformSync } from "esbuild";
import { ContentType } from "./types";
import {
  CACHE_CONTROL,
  computeHash,
  getCDNFilePath,
  getFilePath,
  transformOpts,
} from "./utils";

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

  public async transformAndUpload(params: {
    content: string;
    name: string;
    folder: string;
    hash?: string;
  }): Promise<{ file: string; sourcemap: string }> {
    const { content, name, folder, hash } = params;
    const version = hash || computeHash(content);
    const { file, sourcemap } = getFilePath(folder, name, version);
    const isFileExists = await this.isFileExists(file);

    if (!isFileExists) {
      const result = transformSync(content, transformOpts);
      const moduleContent = `${result.code}\n //# sourceMappingURL=./${name}.map@${version}`;

      await this.uploadFile(
        Buffer.from(moduleContent, "utf-8"),
        file,
        ContentType.JAVASCRIPT
      );
      await this.uploadFile(
        Buffer.from(result.map, "utf-8"),
        sourcemap,
        ContentType.JSON
      );
    }

    return getCDNFilePath(getFilePath(folder, name, version));
  }

  public async uploadFile(
    content: Buffer,
    fileName: string,
    contentType: ContentType
  ) {
    console.log(`Uploading`, fileName);
    try {
      const file = this.bucket.file(fileName);

      await file.save(content, {
        metadata: {
          gzip: true,
          contentType,
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
