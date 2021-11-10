import { ASTBuilders, ASTUtils } from "@teleporthq/teleport-plugin-common";
import {
  ComponentPlugin,
  ComponentPluginFactory,
  ComponentStructure,
  UIDLGlobalAsset,
} from "@teleporthq/teleport-types";
const { createJSXTag } = ASTBuilders;
const { addAttributeToJSXTag, addChildJSXTag } = ASTUtils;

interface GlobalPluginProps {
  configTagIdentifier: "Helmet" | "Head";
  configTagDependencyPath: "react-helmet" | "next/head";
  isDefaultImport: boolean;
}

const createJSXGlobalPlugin: ComponentPluginFactory<GlobalPluginProps> = (
  config
) => {
  const {
    configTagIdentifier = "Helmet",
    configTagDependencyPath = "react-helmet",
    isDefaultImport = false,
  } = config || {};

  const globalPlugin: ComponentPlugin = async (
    structure: ComponentStructure
  ) => {
    const { uidl, chunks, dependencies } = structure;
    const astTags = [];

    if (uidl.seo.assets.length > 0) {
      uidl.seo.assets.forEach((asset: UIDLGlobalAsset) => {
        if (
          asset.type === "font" ||
          (asset.type === "style" && "path" in asset)
        ) {
          const link = createJSXTag("link");
          addAttributeToJSXTag(link, "rel", "stylesheet");
          addAttributeToJSXTag(link, "href", asset.path);
          astTags.push(link);
        }

        if (asset.type === "style") {
          if ("content" in asset) {
            const styleTag = createJSXTag("style");
            addAttributeToJSXTag(styleTag, "dangerouslySetInnerHTML", {
              __html: asset.content,
            });
            astTags.push(styleTag);
          }
        }
      });
    }

    if (astTags.length > 0) {
      const root = createJSXTag(configTagIdentifier, astTags);
      const rootChunk = chunks.find((chunk) => chunk.name === "jsx-component");
      // @ts-ignore
      rootChunk.meta.nodesLookup[uidl.node.content.key].children.push(root);

      dependencies[configTagIdentifier] = {
        path: configTagDependencyPath,
        version: "0.0.0",
        type: "package",
        meta: {
          namedImport: isDefaultImport ? false : true,
        },
      };
    }

    return structure;
  };

  return globalPlugin;
};

export default createJSXGlobalPlugin();
