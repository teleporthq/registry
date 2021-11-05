import reactComponentPlugin from "@teleporthq/teleport-plugin-react-base-component";
import reactStyledComponentsPlugin, {
  createStyleSheetPlugin,
} from "@teleporthq/teleport-plugin-react-styled-components";
import importStatementsPlugin from "@teleporthq/teleport-plugin-import-statements";
import { createComponentGenerator } from "@teleporthq/teleport-component-generator";
import { ReactMapping } from "@teleporthq/teleport-component-generator-react";
import propTypesPlugin from '@teleporthq/teleport-plugin-jsx-proptypes'

const generator = createComponentGenerator();
generator.addMapping(ReactMapping);
generator.addPlugin(reactComponentPlugin);
generator.addPlugin(propTypesPlugin)
generator.addPlugin(reactStyledComponentsPlugin);
generator.addPlugin(importStatementsPlugin);

const styleSheetGenerator = createComponentGenerator();
styleSheetGenerator.addPlugin(createStyleSheetPlugin());
styleSheetGenerator.addPlugin(importStatementsPlugin);

export { generator, styleSheetGenerator };
