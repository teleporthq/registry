import { Request, Response } from "express";
import { gcloud } from "../cloud";
import { generator } from "../generator";

export const component = async (req: Request, res: Response) => {
  const { styleSetDefinitions, designLanguage, folder } = req.body || {
    components: [],
    styleSetDefinitions: {},
    designLanguage: {},
    folder: null,
  };

  try {
    const { files } = await generator.tokens(
      designLanguage,
      styleSetDefinitions
    );
    const { filePath, mapPath } = await gcloud.transformAndUpload({
      content: files[0].content,
      name: files[0].name,
      folder,
    });
    console.log(filePath, mapPath);
  } catch (e) {
    console.trace(e);
    res.status(500).json({ error: "Failed in generating component" });
  }
};
