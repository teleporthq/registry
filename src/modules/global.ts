import { Request, Response } from "express";
import { gcloud } from "../cloud";
import { generator } from "../generator";
import { computeHash } from "../utils";

export const globals = async (req: Request, res: Response) => {
  const { assets, folder } = req.body || {
    assets: [],
    folder: null,
  };
  try {
    const { files } = await generator.globals(assets);
    const { filePath, mapPath } = await gcloud.transformAndUpload({
      content: files[0].content,
      folder,
      name: files[0].name,
      opts: {
        jsx: "transform",
        jsxFragment: "Fragment",
        loader: "jsx",
      },
    });
    return res.status(200).json({
      file: `https://${process.env.BUCKET_NAME}/${filePath}`,
      sourcemap: `https://${process.env.BUCKET_NAME}/${mapPath}`,
    });
  } catch (e) {
    console.trace(e);
    return res.status(500).json({ error: "Failed in generating Globals" });
  }
};
