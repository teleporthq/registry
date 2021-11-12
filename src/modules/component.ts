import { Request, Response } from "express";
import { gcloud } from "../cloud";
import { generator } from "../generator";
import { resolveStyleSetDefinitions } from "@teleporthq/teleport-uidl-resolver";
import { ComponentUIDL } from "@teleporthq/teleport-types";
import { init, parse } from "es-module-lexer";
import {
  computeHash,
  getCDNFilePath,
  getFilePath,
  transformOpts,
} from "../utils";
import { transformSync } from "esbuild";
import { StringUtils } from "@teleporthq/teleport-shared";
import { ContentType } from "../types";
const { removeIllegalCharacters, camelCaseToDashCase } = StringUtils;
const MagicString = require("magic-string");

export const component = async (req: Request, res: Response) => {
  const { styleSetDefinitions, designLanguage, folder, assets, components } =
    req.body || {
      components: {},
      styleSetDefinitions: {},
      designLanguage: {},
      assets: [],
      folder: null,
    };

  try {
    await init;
    let paths: Map<string, { file: string; sourcemap: string }> = new Map();

    const styleFiles = await generator.tokens(
      designLanguage,
      styleSetDefinitions
    );
    const hash: string = computeHash(styleFiles.files[0].content);

    const style = await gcloud.transformAndUpload({
      content: styleFiles.files[0].content,
      name: styleFiles.files[0].name,
      folder,
      hash,
    });
    paths.set("style", style);

    const globalFiles = await generator.globals(assets);
    const globalHash = computeHash(globalFiles.files[0].content);
    const globals = await gcloud.transformAndUpload({
      content: globalFiles.files[0].content,
      name: globalFiles.files[0].name,
      folder,
      hash: globalHash,
    });
    paths.set("globals", globals);

    /* Generating all components */
    const comps: Record<
      string,
      {
        content: string;
        hash: string;
        map?: string;
        file?: string;
        sourcemap?: string;
      }
    > = {};
    for (const comp of Object.values(components as unknown as ComponentUIDL)) {
      const { files } = await generator.component(comp, {
        projectStyleSet: {
          styleSetDefinitions: resolveStyleSetDefinitions(styleSetDefinitions),
          path: "",
          fileName: "style",
          importFile: true,
        },
      });

      comps[`./${camelCaseToDashCase(removeIllegalCharacters(comp.name))}`] = {
        content: files[0].content,
        hash: computeHash(files[0].content),
      };
    }

    /* Remapping the hashes of local imports with remote locations */
    for (const compId of Object.keys(comps)) {
      const { code } = transformSync(comps[compId].content, {
        ...transformOpts,
        minify: false,
      });
      const [imports] = parse(code);
      const magic = new MagicString(code);

      for (const id of imports) {
        if (id.n.startsWith(".")) {
          const { file } = getCDNFilePath(
            folder,
            id.n.substring(2),
            comps[id.n].hash
          );
          magic.overwrite(id.s, id.e, file);
        }

        if (id.n === "style") {
          magic.overwrite(id.s, id.e, paths.get("style").file);
        }
      }

      const filename = compId.substring(2);
      const { file, sourcemap } = getFilePath(
        folder,
        filename,
        comps[compId].hash
      );
      const isFileExists = await gcloud.isFileExists(file);
      if (!isFileExists) {
        await gcloud.uploadFile(
          Buffer.from(magic.toString()),
          file,
          ContentType.JAVASCRIPT
        );
        await gcloud.uploadFile(
          Buffer.from(magic.generateMap().toString()),
          sourcemap,
          ContentType.JSON
        );
      }

      paths.set(filename, getCDNFilePath(folder, filename, comps[compId].hash));
    }

    res.status(200).json(Object.fromEntries(paths));
  } catch (e) {
    console.trace(e);
    res.status(500).json({ error: "Failed in generating component" });
  }
};
