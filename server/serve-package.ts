import zlib from "zlib";
import etag from "etag";
import sha1 from "sha1";
import { join } from "path";
import semver from "semver";
import fetch from "node-fetch";
import { readFileSync } from "fs";
import { fork } from "child_process";
import { ParsedUrlQueryInput } from "querystring";
import { NextFunction, Request, Response } from "express";

import cache from "./cache";
import logger from "./logger";
import { getBundleName } from "./utils/helper";
import findVersion from "./utils/findVersion";
import { sendBadRequest, sendError } from "./utils/responses";
import { root, registry, additionalBundleResHeaders } from "./config";
import { PackageJSON, PackageVersions, ChildProcessType } from "./types";

export const stringify = (query: ParsedUrlQueryInput): string => {
  const str = Object.keys(query)
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join("&");
  return str ? `?${str}` : "";
};

const servePackage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<unknown> => {
  if (req.method !== "GET") return next();
  // @ts-ignore
  const match = /^\/(?:@([^\/]+)\/)?([^@\/]+)(?:@(.+?))?(?:\/(.+?))?(?:\?(.+))?$/.exec(
    req.url
  );

  if (!match) {
    // TODO make this prettier
    return sendBadRequest(res, "Invalid module ID");
  }

  const user = match[1];
  const id = match[2];
  const tag = match[3] || "latest";
  const deep = match[4];
  const queryString = match[5];

  const qualified = user ? `@${user}/${id}` : id;
  const query: ParsedUrlQueryInput = (queryString || "")
    .split("&")
    .reduce((query: ParsedUrlQueryInput, pair) => {
      if (!pair) return query;

      const [key, value] = pair.split("=");
      query[key] = value || true;
      return query;
    }, {});

  try {
    const result = await fetch(
      `${registry}/${encodeURIComponent(qualified).replace("%40", "@")}`
    );
    const packageRequested = await result.json();
    const { versions } = packageRequested;

    // checking if npm is returning the versions
    if (!versions) {
      logger.error(`[${qualified}] invalid module`);
      return sendBadRequest(res, "invalid Module");
    }

    // checking if the version requested is valid and if it is present in the list
    const version = findVersion(packageRequested, tag);
    if (!semver.valid(version)) {
      logger.error(`[${qualified}] invalid tag`);
      return sendBadRequest(res, "invalid tag");
    }

    // If the user requests with a tagname
    // They should be redirected using the latest version number
    // react/latest ---> react/16.8
    if (version !== tag) {
      let url = `/${packageRequested.name}@${version}`;
      if (deep) url += `/${deep}`;
      url += stringify(query);

      res.redirect(302, url);
      return;
    }

    // If everything is good so far, then fetch the package and do the bundling part
    try {
      const zipped = await fetchBundle(packageRequested, tag, deep, query);

      if (!zipped) {
        logger.info(`[${qualified}] Failed is fetching the bundle`);
        return sendError(res, `Failed in fetching the bundle ${qualified}`);
      }

      logger.info(`[${qualified}] serving ${zipped.length} bytes`);
      res.status(200);
      res.set(
        Object.assign(
          {
            "Content-Length": zipped.length,
            "Content-Type": "application/javascript; charset=utf-8",
            "Content-Encoding": "gzip",
          },
          additionalBundleResHeaders
        )
      );

      // FIXME(sven): calculate the etag based on the original content
      // ETag is used to manage the cache with the help of version number
      res.setHeader("ETag", etag(zipped));
      res.end(zipped);
    } catch (err) {
      logger.error(`[${qualified}] ${err.message}`, err.stack);
      const page = readFileSync(`${root}/server/templates/500.html`, {
        encoding: "utf-8",
      }).replace("__ERROR__", err.message);

      sendError(res, page);
    }
  } catch (e) {
    logger.error(`[${qualified}] Failed in fetching package from npm`);
    return sendBadRequest(
      res,
      `Failed in fetching package from the npm ${qualified}`
    );
  }
};

const inProgress: Record<string, unknown> = {};

const fetchBundle = async (
  pkg: PackageJSON,
  version: PackageVersions,
  deep: string,
  query: ParsedUrlQueryInput
): Promise<Buffer> => {
  let hash = `${pkg.name}@${version}`;
  if (deep) hash += `_${deep.replace(/\//g, "_")}`;
  hash += stringify(query);

  logger.info(`[${pkg.name}] requested package`);

  hash = sha1(hash);

  const bundleName = getBundleName(
    hash,
    (pkg.name as unknown) as string,
    version
  );

  const [result, file] = await cache.has(
    bundleName,
    (pkg.name as unknown) as string,
    version,
    "npm"
  );

  if (result) {
    logger.info(`[${pkg.name}] is cached`);
    return Promise.resolve(cache.get(file));
  }

  if (inProgress[hash]) {
    logger.info(`[${pkg.name}] request was already in progress`);
  } else {
    logger.info(`[${pkg.name}] is not cached`);

    inProgress[hash] = createBundle(hash, pkg, version, deep, query)
      .then(
        (result: string) => {
          const zipped = zlib.gzipSync(result);
          cache.set(
            bundleName,
            result,
            (pkg.name as unknown) as string,
            version,
            "npm"
          );
          return zipped;
        },
        (err) => {
          inProgress[hash] = null;
          throw err;
        }
      )
      .then((zipped) => {
        inProgress[hash] = null;
        return zipped;
      });
  }

  return inProgress[hash] as Promise<Buffer>;
};

const createBundle = (
  hash: string,
  pkg: PackageJSON,
  version: PackageVersions,
  deep: string,
  query: ParsedUrlQueryInput
) => {
  return new Promise((fulfil, reject) => {
    const child = fork(join(__dirname, "child-processes", "create-bundle"), [
      "-r",
      "ts-node/register",
    ]);

    if (!child) {
      reject();
    }

    child.on("message", (message: ChildProcessType) => {
      if (typeof message === "string" && message === "ready") {
        child.send({
          type: "start",
          params: { hash, pkg, version, deep, query },
        });
      }

      if (typeof message === "object") {
        if (message.type === "info") {
          logger.info(message.message);
        } else if (message.type === "error") {
          const error = new Error(message.message);
          error.stack = message.stack;
          reject(error);
          child.kill();
        } else if (message.type === "result") {
          fulfil(message.code);
          child.kill();
        }
      }
    });
  });
};

export default servePackage;
