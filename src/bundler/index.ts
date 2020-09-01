import path from "path";
import { mkdirSync, rmdirSync } from "fs";
import { ParsedUrlQueryInput } from "querystring";
import os from "os";

import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "rollup-plugin-replace";
import babel from "@rollup/plugin-babel";
// @ts-ignore
import importMap from "rollup-plugin-esm-import-to-url";

import { makeLegalIdentifier } from "../utils/makeLegalIdentifier";
import {
  info,
  findEntry,
  sanitizePkg,
  fetchAndExtract,
  installBabelRuntime,
  installDependencies,
} from "./utils";
import { PackageJSON } from "../types";

export const createBundle = async (
  hash: string,
  pkg: PackageJSON,
  version: string,
  deep: string,
  query: ParsedUrlQueryInput
): Promise<string> => {
  const dir = `${os.tmpdir()}/${hash}`;
  const cwd = `${dir}/package`;

  try {
    mkdirSync(dir);
    await fetchAndExtract(pkg, version, dir);
    await sanitizePkg(cwd);
    await installBabelRuntime(cwd);
    await installDependencies(cwd);

    const code = await bundle(cwd, deep, query);
    rmdirSync(dir, { recursive: true });
    return code;
  } catch (err) {
    rmdirSync(dir, { recursive: true });

    console.error(err.stack);
    throw new Error(err.message);
  }
};

const bundle = async (
  cwd: string,
  deep: string,
  query: ParsedUrlQueryInput
) => {
  const pkg = await import(`${cwd}/package.json`);
  const moduleName: string = ((query.name ||
    makeLegalIdentifier(pkg.name)) as unknown) as string;

  const entryName = pkg.module || pkg["jsnext:main"] || pkg.main;

  if (!entryName) {
    throw new Error(
      "package has no entry file; please specify a `module` key in your `package.json`."
    );
  }

  const entry = deep
    ? path.resolve(cwd, deep)
    : findEntry(path.resolve(cwd, entryName));

  return bundleWithRollup(cwd, pkg, entry, moduleName);
};

const bundleWithRollup = async (
  cwd: string,
  pkg: PackageJSON,
  moduleEntry: string,
  name: string
) => {
  const bundle = await rollup({
    input: path.resolve(cwd, moduleEntry),
    plugins: [
      replace({
        "process.env.NODE_ENV": JSON.stringify("production"),
      }),
      babel({
        babelHelpers: "runtime",
        plugins: [
          "@babel/plugin-transform-runtime",
          [
            "transform-react-remove-prop-types",
            {
              mode: "remove",
              removeImport: true,
            },
          ],
        ],
      }),
      nodeResolve({
        mainFields: ["browser", "jsnext:main", "module", "main"],
      }),
      commonjs({
        // @ts-ignore
        requireReturnsDefault: "preferred",
      }),
      importMap({
        imports: {
          react: "https://cdn.skypack.dev/react@latest",
          "react-dom": "https://cdn.skypack.dev/react-dom@latest",
        },
      }),
    ],
  });

  const result = await bundle.generate({
    format: "esm",
    name,
  });

  info(`[${pkg.name}] bundled using Rollup`);

  return result.output[0].code;
};
