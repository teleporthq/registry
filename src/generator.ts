import reactComponentPlugin from "@teleporthq/teleport-plugin-react-base-component";
import reactStyledComponentsPlugin from "@teleporthq/teleport-plugin-react-styled-components";
import importStatementsPlugin from "@teleporthq/teleport-plugin-import-statements";
import prettierJSX from "@teleporthq/teleport-postprocessor-prettier-jsx";
import { createComponentGenerator } from "@teleporthq/teleport-component-generator";
import { ReactMapping } from "@teleporthq/teleport-component-generator-react";

const generator = createComponentGenerator();
generator.addMapping(ReactMapping);
generator.addPlugin(reactComponentPlugin);
generator.addPlugin(reactStyledComponentsPlugin);
generator.addPlugin(importStatementsPlugin);
generator.addPostProcessor(prettierJSX);

export { generator };
