import { existsSync, mkdirSync, rmdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { TransformOptions } from "esbuild";
import hash from "object-hash";

export const CACHE_CONTROL =
  process.env.NODE_ENV === "development" ? "max-age=100" : "max-age=3600";

export const camelCaseToDashCase = (str: string): string =>
  str.replace(/([a-zA-Z])(?=[A-Z])/g, "$1-").toLowerCase();

export const buildPath =
  process.env.NODE_ENV === "development"
    ? join(__dirname, "../build")
    : join(tmpdir(), "build");

export const ensureBuildPath = () => {
  if (!existsSync(buildPath)) {
    mkdirSync(buildPath);
  } else {
    rmdirSync(buildPath, { recursive: true });
    mkdirSync(buildPath);
  }
};

export const computeHash = (content: any): string => {
  return hash(content);
};

export const transformOpts: TransformOptions = {
  format: "esm",
  target: "es6",
  minify: process.env.NODE_ENV === "development" ? false : true,
  sourcemap: true,
  jsx: "transform",
  jsxFragment: "Fragment",
  loader: "jsx",
  sourcesContent: false,
};

export const getCDNFilePath = (params: { file: string; sourcemap: string }) => {
  const { file, sourcemap } = params;
  return {
    file: `https://${process.env.BUCKET_NAME}/${file}`,
    sourcemap: `https://${process.env.BUCKET_NAME}/${sourcemap}`,
  };
};

export const getFilePath = (
  folder: string,
  filename: string,
  version: string
) => {
  const file = `${folder}/${filename}@${version}.js`;
  const sourcemap = `${folder}/${filename}@${version}.map`;

  return { file, sourcemap };
};
