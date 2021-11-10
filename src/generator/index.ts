import pluginReactBase from "@teleporthq/teleport-plugin-react-base-component";
import { createStyleSheetPlugin } from "@teleporthq/teleport-plugin-react-styled-components";
import importStatementsPlugin from "@teleporthq/teleport-plugin-import-statements";
import { createComponentGenerator } from "@teleporthq/teleport-component-generator";
import { generateComponent } from "@teleporthq/teleport-code-generator";
import { createStyleSheetPlugin as createReactJSSStyleSheetPlugin } from "@teleporthq/teleport-plugin-react-jss";
import { Parser } from "@teleporthq/teleport-uidl-validator";
import {
  ComponentType,
  ComponentUIDL,
  GeneratorOptions,
  ReactStyleVariation,
  UIDLDesignTokens,
  UIDLGlobalAsset,
  UIDLMetaTag,
  UIDLStyleSetDefinition,
} from "@teleporthq/teleport-types";
import pluginGlobals from "./jsx-plugin";

const styledComonentsGenerator = createComponentGenerator();
styledComonentsGenerator.addPlugin(createStyleSheetPlugin());
styledComonentsGenerator.addPlugin(importStatementsPlugin);

const reactJSSGenerator = createComponentGenerator();
reactJSSGenerator.addPlugin(createReactJSSStyleSheetPlugin());
reactJSSGenerator.addPlugin(importStatementsPlugin);

const styleSheetFactory = {
  [ReactStyleVariation.StyledComponents]: styledComonentsGenerator,
  [ReactStyleVariation.ReactJSS]: reactJSSGenerator,
};
export class Generator {
  compType: ComponentType = ComponentType.REACT;
  styleType: ReactStyleVariation;

  constructor(styleType?: ReactStyleVariation) {
    this.styleType = styleType || ReactStyleVariation.StyledComponents;
  }

  async component(uidl: ComponentUIDL, options: GeneratorOptions) {
    return generateComponent(uidl, {
      styleVariation: this.styleType,
      componentType: ComponentType.REACT,
      // @ts-ignore
      componentGeneratorOptions: options,
    });
  }

  get styleSheet() {
    return styleSheetFactory[this.styleType];
  }

  async globals(assets: UIDLGlobalAsset[]) {
    /* TODO: Instead of creating a root inside the global plugin.
    And then again here wrapping a empty div. We can just create the main root here.
    It will me elementType with a dependency to load form library */
    const uidl: ComponentUIDL = {
      name: "globals",
      seo: {
        assets,
      },
      node: {
        type: "element",
        content: {
          elementType: "container",
        },
      },
    };

    const generator = createComponentGenerator();
    generator.addPlugin(pluginReactBase);
    generator.addPlugin(pluginGlobals);
    generator.addPlugin(importStatementsPlugin);

    return generator.generateComponent(uidl);
  }

  async tokens(
    designLanguage: { tokens: UIDLDesignTokens },
    styleSetDefinitions: Record<string, UIDLStyleSetDefinition>
  ) {
    if (
      Object.keys(styleSetDefinitions || {}).length === 0 &&
      Object.keys(designLanguage?.tokens || {}).length === 0
    ) {
      return null;
    }

    const uidl = this.globalStyleUIDL(designLanguage, styleSetDefinitions);
    return this.styleSheet.generateComponent(uidl, {
      isRootComponent: true,
    });
  }

  private globalStyleUIDL(
    designLanguage: { tokens: UIDLDesignTokens },
    styleSetDefinitions: Record<string, UIDLStyleSetDefinition>
  ): ComponentUIDL {
    const rootUIDL: ComponentUIDL = {
      name: "root",
      designLanguage,
      styleSetDefinitions,
      stateDefinitions: {},
      propDefinitions: {},
      node: {
        type: "element",
        content: {
          elementType: "container",
        },
      },
    };
    const parsedComponentUIDL = Parser.parseComponentJSON(
      rootUIDL as unknown as Record<string, unknown>
    );
    return parsedComponentUIDL;
  }
}

export const generator = Object.freeze(
  new Generator(ReactStyleVariation.StyledComponents)
);
