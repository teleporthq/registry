import reactComponentPlugin from "@teleporthq/teleport-plugin-react-base-component";
import reactStyledComponentsPlugin, {
  createStyleSheetPlugin,
} from "@teleporthq/teleport-plugin-react-styled-components";
import importStatementsPlugin from "@teleporthq/teleport-plugin-import-statements";
import { createComponentGenerator } from "@teleporthq/teleport-component-generator";
import { ReactMapping } from "@teleporthq/teleport-component-generator-react";

const generator = createComponentGenerator();
generator.addMapping(ReactMapping);
generator.addPlugin(reactComponentPlugin);
generator.addPlugin(reactStyledComponentsPlugin);
generator.addPlugin(importStatementsPlugin);

const styleSheetGenerator = createComponentGenerator();
styleSheetGenerator.addPlugin(createStyleSheetPlugin());
styleSheetGenerator.addPlugin(importStatementsPlugin);

export { generator, styleSheetGenerator };
