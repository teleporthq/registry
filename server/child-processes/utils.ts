// @ts-ignore
import sander from "sander";
import request from "request";
import child_process from "child_process";
import tar from "tar";
import { npmInstallEnvVars, root } from "../config";
import { PackageJSON } from "../types";

export const sanitizePkg = (cwd: string) => {
  const pkg = require(`${cwd}/package.json`);

  pkg.peerDependencies = Object.keys(pkg.peerDependencies).reduce(
    (acc, item) => {
      // These packages get's bundled multiple times and creats noise in running
      // So when defined in peer we can ignore and rewritten to latest version of skypack
      // We have a issue to fix react and react-dom
      if (!["react", "react-dom"].includes(item)) {
        return (acc = {
          ...acc,
          [item]: pkg.peerDependencies[item],
        });
      }
      return acc;
    },
    {}
  );

  pkg.scripts = {};
  return sander.writeFile(
    `${cwd}/package.json`,
    JSON.stringify(pkg, null, "  ")
  );
};

export const fetchAndExtract = (pkg: unknown, version: string, dir: string) => {
  // @ts-ignore
  const tarUrl = pkg.versions[version].dist.tarball;

  // @ts-ignore
  info(`[${pkg.name}] fetching ${tarUrl}`);

  return new Promise((fulfil, reject) => {
    let timedout = false;

    const timeout = setTimeout(() => {
      reject(new Error("Request timed out"));
      timedout = true;
    }, 10000);

    const input = request(tarUrl);

    // don't like going via the filesystem, but piping into targz
    // was failing for some weird reason
    const intermediate = sander.createWriteStream(`${dir}/package.tgz`);

    input.pipe(intermediate);

    intermediate.on("close", () => {
      clearTimeout(timeout);

      if (!timedout) {
        // @ts-ignore
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

export const exec = (cmd: string, cwd: string, pkg: PackageJSON) => {
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

export const info = (message: string) => {
  process.send({
    type: "info",
    message,
  });
};

export const findEntry = (file: string) => {
  try {
    const stats = sander.statSync(file);
    if (stats.isDirectory()) return `${file}/index.js`;
    return file;
  } catch (err) {
    return `${file}.js`;
  }
};

export const installDependencies = (cwd: string): Promise<unknown> => {
  const pkg = require(`${cwd}/package.json`);

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

export const installBabelRuntime = (cwd: string): Promise<unknown> => {
  const pkg = require(`${cwd}/package.json`);
  const envVariables = npmInstallEnvVars.join(" ");

  // Fetch the babel runtime value from the package.json
  const installCommand = `${envVariables} ${root}/node_modules/.bin/npm install @babel/runtime --production`;

  return exec(installCommand, cwd, pkg).then(() => {
    info("Installing @babel/runtime");
    return Promise.resolve();
  });
};
