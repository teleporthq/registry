import { Storage } from "@google-cloud/storage";
import { transformSync } from "esbuild";
import { ContentType } from "./types";
import { CACHE_CONTROL, computeHash } from "./utils";

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
    opts?: Record<string, string | boolean>;
  }): Promise<{ filePath: string; mapPath: string }> {
    const { content, name, folder, opts = {} } = params;
    const fileName = `${name}.js`;
    const mapName = `${name}.js.map`;
    const hash = computeHash(content);

    const filePath = `${folder}/${fileName}@${hash}`;
    const mapPath = `${folder}/${mapName}@${hash}`;
    const isFileExists = await this.isFileExists(filePath);

    if (!isFileExists) {
      const result = transformSync(content, {
        format: "esm",
        target: "es6",
        minify: process.env.NODE_ENV === "development" ? false : true,
        sourcemap: true,
        ...opts,
      });
      const moduleContent = `${result.code}\n //# sourceMappingURL=./${fileName}.map@${hash}`;

      await this.uploadFile(
        Buffer.from(moduleContent, "utf-8"),
        filePath,
        ContentType.JAVASCRIPT
      );
      await this.uploadFile(
        Buffer.from(result.map, "utf-8"),
        mapPath,
        ContentType.JSON
      );
    }

    return { filePath, mapPath };
  }

  public async uploadFile(
    content: Buffer,
    fileName: string,
    type: ContentType
  ) {
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
