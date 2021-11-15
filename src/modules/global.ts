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
    const result = await gcloud.transformAndUpload({
      content: files[0].content,
      folder,
      name: files[0].name,
    });
    return res.status(200).json(result);
  } catch (e) {
    console.trace(e);
    return res.status(500).json({ error: "Failed in generating Globals" });
  }
};
