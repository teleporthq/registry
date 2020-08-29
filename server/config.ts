import path from "path";
import { mkdirSync, rmdirSync } from "fs";

export const GCLOUD_CONSTANTS = {
  APPLICATION_TYPE: "application/javascript",
  CACHE_CONTROL: "max-age=3600",
};

const root = path.resolve(__dirname, "..");

let tmpdir = process.env.NODE_ENV === "production" ? `/tmp` : `${root}/.tmp`;
const bucketName = "bundled-packages-test-dev";
const registry = "https://registry.npmjs.org";

if (process.env.NODE_ENV !== "production") {
  try {
    rmdirSync(tmpdir);
    mkdirSync(tmpdir);
  } catch (err) {
    // already exists
  }
}

let npmInstallEnvVars: string[] = [];
let debugEndpoints = true;

let additionalBundleResHeaders: Record<string, string> = {
  "Cache-Control": "max-age=86400",
};

let cacheExpiration = 0;

if (process.env.NODE_ENV === "production") {
  tmpdir = "/tmp";
  cacheExpiration = 60 * 60 * 24 * 365;
  npmInstallEnvVars = ["npm_config_cache=/tmp"];
  debugEndpoints = false;
  additionalBundleResHeaders = {
    "Cache-Control": "public, max-age=" + cacheExpiration,
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Request-Method": "GET",
    // "X-Powered-By": "github.com/rich-harris/packd",
    "Strict-Transport-Security": `max-age=${cacheExpiration}; includeSubDomains; preload`,
  };
}

export {
  tmpdir,
  cacheExpiration,
  debugEndpoints,
  additionalBundleResHeaders,
  npmInstallEnvVars,
  bucketName,
  registry,
  root,
};
