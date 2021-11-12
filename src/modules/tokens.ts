import { Request, Response } from "express";
import { gcloud } from "../cloud";
import { generator } from "../generator";
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

    const result = await gcloud.transformAndUpload({
      content: files[0].content,
      name: files[0].name,
      folder,
      hash: computeHash(files[0].content),
    });

    return res.status(200).json(result);
  } catch (e) {
    console.trace(e);
    return res
      .status(500)
      .json({ error: "Failed in generating project-stylesheet" });
  }
};
