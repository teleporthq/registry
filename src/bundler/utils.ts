import { createWriteStream, statSync, writeFileSync } from "fs";
import fetch from "node-fetch";
import child_process from "child_process";
import tar from "tar";
import { npmInstallEnvVars, root } from "../config";
import { PackageJSON } from "../types";

export const sanitizePkg = async (cwd: string): Promise<void> => {
  const pkg = await import(`${cwd}/package.json`).then((data) => data.default);

  pkg.peerDependencies = removeReactDependencies(pkg.peerDependencies);
  pkg.devDependencies = removeReactDependencies(pkg.devDependencies);
  pkg.dependencies = removeReactDependencies(pkg.dependencies);

  pkg.scripts = {};
  return writeFileSync(`${cwd}/package.json`, JSON.stringify(pkg, null, "  "));
};

const removeReactDependencies = (
  deps: Record<string, string>
): Record<string, string> => {
  return Object.keys(deps || {}).reduce((acc, item) => {
    // These packages get's bundled multiple times and creats noise in running
    // So when defined in peer we can ignore and rewritten to latest version of skypack
    // We have a issue to fix react and react-dom
    if (!["react", "react-dom"].includes(item)) {
      return (acc = {
        ...acc,
        [item]: deps[item],
      });
    }
    return acc;
  }, {});
};

export const fetchAndExtract = (
  pkg: PackageJSON,
  version: string,
  dir: string
): Promise<unknown> => {
  // @ts-ignore
  const tarUrl = pkg.versions[version].dist.tarball;

  info(`[${pkg.name}] fetching ${tarUrl}`);

  return new Promise((fulfil, reject) => {
    let timedout = false;

    const timeout = setTimeout(() => {
      reject(new Error("Request timed out"));
      timedout = true;
    }, 10000);

    const input = fetch(tarUrl);

    const intermediate = createWriteStream(`${dir}/package.tgz`);

    input
      .then((res) => {
        res.body.pipe(intermediate);
      })
      .catch((err) => {
        reject(
          new Error(`Failed in saving package fetched from registry ${err}`)
        );
      });

    intermediate.on("close", () => {
      clearTimeout(timeout);

      if (!timedout) {
        info(`[${pkg.name}] extracting to ${dir}/package`);

        tar
          .x({
            file: `${dir}/package.tgz`,
            cwd: dir,
          })
          .then(fulfil, reject);
      }
    });
  });
};

export const exec = (
  cmd: string,
  cwd: string,
  pkg: PackageJSON
): Promise<void> => {
  return new Promise((fulfil, reject) => {
    child_process.exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }

      stdout.split("\n").forEach((line) => {
        info(`[${pkg.name}] ${line}`);
      });

      stderr.split("\n").forEach((line) => {
        info(`[${pkg.name}] ${line}`);
      });

      fulfil();
    });
  });
};

export const info = (message: string): void => {
  console.info(message);
};

export const findEntry = (file: string): string => {
  try {
    const stats = statSync(file);
    if (stats.isDirectory()) return `${file}/index.js`;
    return file;
  } catch (err) {
    return `${file}.js`;
  }
};

export const installDependencies = async (cwd: string): Promise<unknown> => {
  const pkg = await import(`${cwd}/package.json`).then((data) => data.default);

  const envVariables = npmInstallEnvVars.join(" ");
  const installCommand = `${envVariables} ${root}/node_modules/.bin/npm install --production`;

  info(`[${pkg.name}] running ${installCommand}`);

  return exec(installCommand, cwd, pkg).then(() => {
    if (!pkg.peerDependencies) return;

    return Object.keys(pkg.peerDependencies).reduce((promise, name) => {
      return promise.then(() => {
        info(`[${pkg.name}] installing peer dependency ${name}`);
        const version = pkg.peerDependencies[name];
        return exec(
          `${root}/node_modules/.bin/npm install "${name}@${version}"`,
          cwd,
          pkg
        );
      });
    }, Promise.resolve());
  });
};

export const installBabelRuntime = async (cwd: string): Promise<unknown> => {
  const pkg = await import(`${cwd}/package.json`).then((data) => data.default);
  const envVariables = npmInstallEnvVars.join(" ");

  // Fetch the babel runtime value from the package.json
  const installCommand = `${envVariables} ${root}/node_modules/.bin/npm install @babel/runtime --production`;

  return exec(installCommand, cwd, pkg).then(() => {
    info("Installing @babel/runtime");
    return Promise.resolve();
  });
};
