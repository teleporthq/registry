import { Request, Response } from "express";
import { gcloud } from "../cloud";
import { generator } from "../generator";
import { resolveStyleSetDefinitions } from "@teleporthq/teleport-uidl-resolver";
import { ComponentUIDL } from "@teleporthq/teleport-types";
import { ImportSpecifier, init, parse } from "es-module-lexer";
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
      styleSetDefinitions: {},
      designLanguage: {},
      assets: [],
      folder: null,
      components: {},
    };

  try {
    await init;
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

    const globalFiles = await generator.globals(assets);
    const gloals = await gcloud.transformAndUpload({
      content: globalFiles.files[0].content,
      name: globalFiles.files[0].name,
      folder,
    });

    /* Traversing commponents */
    const comps: Record<
      string,
      { name: string; content: string; hash: string; deps: ImportSpecifier[] }
    > = {};
    const projectStyleSet = {
      styleSetDefinitions: resolveStyleSetDefinitions(styleSetDefinitions),
      fileName: "",
      path: style.file,
      importFile: true,
    };
    for (const comp of Object.values(
      components as unknown as Record<string, ComponentUIDL>
    )) {
      /* Injecting globals component into every component */
      comp.node.content.children.unshift({
        type: "element",
        content: {
          elementType: "component",
          semanticType: "Globals",
          dependency: {
            version: "0.0.0",
            type: "package",
            path: gloals.file,
          },
        },
      });
      const { files } = await generator.component(
        comp as unknown as Record<string, unknown>,
        {
          projectStyleSet,
        }
      );
      const hash = computeHash(files[0].content);
      const content = transformSync(files[0].content, transformOpts).code;
      const [imports] = parse(content);

      comps[removeIllegalCharacters(camelCaseToDashCase(comp.name))] = {
        name: files[0].name,
        hash,
        content,
        deps: imports.filter((imp) => imp.n.startsWith(".")),
      };
    }

    /* Computing hashes with dependents */
    const files: Record<
      string,
      { version: string; file: string; sourcemap: string }
    > = {};
    Object.keys(comps).forEach((compId) => {
      const comp = comps[compId];
      const version = {
        ...comps[compId].deps.reduce(
          (acc: Record<string, string>, id: ImportSpecifier) => {
            const accId = id.n.substring(2);
            acc[accId] = comps[accId].hash;
            return acc;
          },
          {}
        ),
        [compId]: comps[compId].hash,
      };
      const hash = computeHash(version);
      files[compId] = {
        version: hash,
        ...getFilePath(folder, comp.name, hash),
      };
    });

    /* Upload to bucket */
    for (const compId of Object.keys(comps)) {
      const comp = comps[compId];
      const loc = files[compId];
      const isFileExists = await gcloud.isFileExists(loc.file);
      const isSourceMapExists = await gcloud.isFileExists(loc.sourcemap);

      if (!isFileExists || !isSourceMapExists) {
        const magic = new MagicString(comp.content);

        comp.deps.forEach((dep) => {
          magic.overwrite(
            dep.s,
            dep.e,
            getCDNFilePath(files[dep.n.substring(2)]).file
          );
        });

        const moduleContent = `${magic.toString()}\n //# sourceMappingURL=./${
          comp.name
        }@${loc.version}.map`;

        await gcloud.uploadFile(
          Buffer.from(moduleContent),
          loc.file,
          ContentType.JAVASCRIPT
        );

        await gcloud.uploadFile(
          Buffer.from(magic.generateMap().toString()),
          loc.sourcemap,
          ContentType.JSON
        );
      }
    }

    res.status(200).json(files);
  } catch (e) {
    console.trace(e);
    res.status(500).json({ error: "Failed in generating component" });
  }
};
