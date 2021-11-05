import { createStyleSheetPlugin } from "@teleporthq/teleport-plugin-react-styled-components";
import importStatementsPlugin from "@teleporthq/teleport-plugin-import-statements";
import { createComponentGenerator } from "@teleporthq/teleport-component-generator";
import { generateComponent } from "@teleporthq/teleport-code-generator";
import { createStyleSheetPlugin as cssModulesStyleSheetPlugin } from "@teleporthq/teleport-plugin-css-modules";
import {
  ComponentGenerator,
  ComponentType,
  ComponentUIDL,
  GeneratorOptions,
  ReactStyleVariation,
} from "@teleporthq/teleport-types";

const styledComonentsGenerator = createComponentGenerator();
styledComonentsGenerator.addPlugin(createStyleSheetPlugin());
styledComonentsGenerator.addPlugin(importStatementsPlugin);

const cssModulesGenerator = createComponentGenerator();
cssModulesGenerator.addPlugin(
  cssModulesStyleSheetPlugin({ moduleExtension: true })
);

const styleSheetFactory = {
  [ReactStyleVariation.StyledComponents]: styledComonentsGenerator,
  [ReactStyleVariation.CSSModules]: cssModulesGenerator,
};
export class Generator {
  compType: ComponentType = ComponentType.REACT;
  styleType: ReactStyleVariation;

  constructor(styleType?: ReactStyleVariation) {
    this.styleType = styleType || ReactStyleVariation.CSSModules;
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
}
