import path from "path";
// @ts-ignore
import sander from "sander";

const root = path.resolve(__dirname);
let tmpdir = process.env.NOW ? `/tmp` : `${exports.root}/.tmp`;
const registry = "https://registry.npmjs.org";

if (!process.env.NOW) {
  try {
    sander.rimrafSync(exports.tmpdir);
    sander.mkdirSync(exports.tmpdir);
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

if ((process.env.NODE_ENV = "production")) {
  tmpdir = "/tmp";
  cacheExpiration = 60 * 60 * 24 * 365;
  npmInstallEnvVars = ["npm_config_cache=/tmp"];
  debugEndpoints = false;
  additionalBundleResHeaders = {
    "Cache-Control": "public, max-age=" + cacheExpiration,
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Request-Method": "GET",
    "X-Powered-By": "github.com/rich-harris/packd",
    "Strict-Transport-Security": `max-age=${cacheExpiration}; includeSubDomains; preload`,
  };
}

export {
  tmpdir,
  cacheExpiration,
  debugEndpoints,
  additionalBundleResHeaders,
  npmInstallEnvVars,
  registry,
  root,
};
