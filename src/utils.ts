import { createHash } from "crypto";
import { existsSync, mkdirSync, rmdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

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
