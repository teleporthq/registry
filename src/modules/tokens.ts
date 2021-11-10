import { Request, Response } from "express";
import { transformSync } from "esbuild";
import { gcloud } from "../cloud";
import { generator } from "../generator";
import { ContentType } from "../types";
import { computeHash } from "../utils";

export const tokens = async (req: Request, res: Response) => {
  const { designLanguage, styleSetDefinitions, folder } = req.body || {
    styleSetDefinitions: {},
    designLanguage: {},
    folder: null,
  };

  if (!folder) {
    return res
      .status(400)
      .json({ error: "Folder is missing from the request" });
  }

  try {
    const { files } = await generator.tokens(
      designLanguage,
      styleSetDefinitions
    );

    const hash = computeHash(files[0].content);
    const name = `${files[0].name}.js`;
    const mapName = `${files[0].name}.js.map`;

    const filePath = `${folder}/${name}@${hash}`;
    const mapPath = `${folder}/${mapName}@${hash}`;

    const isFileExists = await gcloud.isFileExists(filePath);
    if (!isFileExists) {
      const result = transformSync(files[0].content, {
        format: "esm",
        target: "es6",
        minify: true,
        sourcemap: true,
      });
      const moduleContent = `${result.code}\n //# sourceMappingURL=./${files[0].name}.js.map@${hash}`;

      await gcloud.uploadFile(
        Buffer.from(moduleContent, "utf-8"),
        filePath,
        ContentType.JAVASCRIPT
      );
      await gcloud.uploadFile(
        Buffer.from(result.map, "utf-8"),
        mapPath,
        ContentType.JSON
      );
    }

    return res.status(200).json({
      file: `https://${process.env.BUCKET_NAME}/${filePath}`,
      sourcemap: `https://${process.env.BUCKET_NAME}/${mapPath}`,
    });
  } catch (e) {
    console.trace(e);
    return res
      .status(500)
      .json({ error: "Failed in generating project-stylesheet" });
  }
};
