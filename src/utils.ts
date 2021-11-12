import { createHash } from "crypto";
import { existsSync, mkdirSync, rmdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { TransformOptions } from "esbuild";

export const CACHE_CONTROL =
  process.env.NODE_ENV === "development" ? "no-cache" : "max-age=3600";

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

export const computeHash = (content: string) => {
  const hashArray = Array.from(
    new Uint8Array(createHash("SHA1").update(content).digest())
  );
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const transformOpts: TransformOptions = {
  format: "esm",
  target: "es6",
  minify: process.env.NODE_ENV === "development" ? false : true,
  sourcemap: true,
  jsx: "transform",
  jsxFragment: "Fragment",
  loader: "jsx",
};

export const getCDNFilePath = (
  folder: string,
  filename: string,
  version: string
) => {
  const { file, sourcemap } = getFilePath(folder, filename, version);
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
  const file = `${folder}/${filename}.js@${version}`;
  const sourcemap = `${folder}/${filename}.js.map@${version}`;

  return { file, sourcemap };
};
