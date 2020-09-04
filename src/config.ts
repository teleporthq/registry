import path from "path";

export const GCLOUD_CONSTANTS = {
  APPLICATION_TYPE: "application/javascript",
  CACHE_CONTROL: "max-age=3600",
};

const root = path.resolve(__dirname, "..");

const bucketName = "playground-bundled-packages-qa";
const registry = "https://registry.npmjs.org";

let npmInstallEnvVars: string[] = [];

let additionalBundleResHeaders: Record<string, string> = {
  "Cache-Control": "max-age=86400",
};

let cacheExpiration = 0;

if (process.env.NODE_ENV === "production") {
  cacheExpiration = 60 * 60 * 24 * 365;
  npmInstallEnvVars = ["npm_config_cache=/tmp"];
  additionalBundleResHeaders = {
    "Cache-Control": "public, max-age=" + cacheExpiration,
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Request-Method": "GET",
    "Strict-Transport-Security": `max-age=${cacheExpiration}; includeSubDomains; preload`,
  };
}

export {
  cacheExpiration,
  additionalBundleResHeaders,
  npmInstallEnvVars,
  bucketName,
  registry,
  root,
};
