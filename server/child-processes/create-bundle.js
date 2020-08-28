const path = require("path");
const sander = require("sander");
const child_process = require("child_process");
const tar = require("tar");
const request = require("request");
const rollup = require("rollup");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const replace = require("rollup-plugin-replace");
const babel = require("@rollup/plugin-babel").default;
const { getBabelOutputPlugin } = require("@rollup/plugin-babel");
// const Terser = require("terser");
const importMap = require("rollup-plugin-esm-import-to-url");
const makeLegalIdentifier = require("../utils/makeLegalIdentifier");
const rewriteImport = require("../babel-plugins/rewrite-imports");
const { transform } = require("@babel/core");

const { npmInstallEnvVars, root, tmpdir } = require("../../config.js");

process.on("message", (message) => {
  if (message.type === "start") {
    createBundle(message.params);
  }
});

process.send("ready");

async function createBundle({ hash, pkg, version, deep, query }) {
  const dir = `${tmpdir}/${hash}`;
  const cwd = `${dir}/package`;

  try {
    await sander.mkdir(dir);
    await fetchAndExtract(pkg, version, dir);
    await sanitizePkg(cwd);
    await installBabelRuntime(cwd);
    // await installDependencies(cwd);

    const code = await bundle(cwd, deep, query);

    // const result = transformResult(code);

    // info(`[${pkg.name}] minifying`);

    // const result = Terser.minify(code);

    // if (result.error) {
    //   info(`[${pkg.name}] minification failed: ${result.error.message}`);
    // }

    // info(result);

    process.send({
      type: "result",
      // code: result.code,
      code,
    });
  } catch (err) {
    process.send({
      type: "error",
      message: err.message,
      stack: err.stack,
    });
  }

  // sander.rimraf(dir);
}

// function transformResult(code) {
//   return transform(code, {
//     plugins: [rewriteImport],
//   });
// }

function fetchAndExtract(pkg, version, dir) {
  const tarUrl = pkg.versions[version].dist.tarball;

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
}

function sanitizePkg(cwd) {
  const pkg = require(`${cwd}/package.json`);

  // pkg.peerDependencies = Object.keys(pkg.peerDependencies).reduce(
  //   (acc, item) => {
  //     // These packages get's bundled multiple times and creats noise in running
  //     // So when defined in peer we can ignore and rewritten to latest version of skypack
  //     // We have a issue to fix react and react-dom
  //     if (!["react", "react-dom"].includes(item)) {
  //       return (acc = {
  //         ...acc,
  //         [item]: pkg.peerDependencies[item],
  //       });
  //     }
  //     return acc;
  //   },
  //   {}
  // );

  info(JSON.stringify(pkg.peerDependencies, null, 2));
  pkg.scripts = {};
  return sander.writeFile(
    `${cwd}/package.json`,
    JSON.stringify(pkg, null, "  ")
  );
}

function installBabelRuntime(cwd) {
  const pkg = require(`${cwd}/package.json`);
  const envVariables = npmInstallEnvVars.join(" ");

  // Fetch the babel runtime value from the package.json
  const installCommand = `${envVariables} ${root}/node_modules/.bin/npm install @babel/runtime --production`;

  return exec(installCommand, cwd, pkg).then(() => {
    info("Installing @babel/runtime");
    return Promise.resolve();
  });
}

function installDependencies(cwd) {
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
}

function bundle(cwd, deep, query) {
  const pkg = require(`${cwd}/package.json`);
  const moduleName = query.name || makeLegalIdentifier(pkg.name);

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
}

function findEntry(file) {
  try {
    const stats = sander.statSync(file);
    if (stats.isDirectory()) return `${file}/index.js`;
    return file;
  } catch (err) {
    return `${file}.js`;
  }
}

async function bundleWithRollup(cwd, pkg, moduleEntry, name) {
  const bundle = await rollup.rollup({
    input: path.resolve(cwd, moduleEntry),
    plugins: [
      replace({
        "process.env.NODE_ENV": JSON.stringify("production"),
      }),
      commonjs(),
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
          [
            rewriteImport,
            {
              deps: pkg.dependencies,
              devDeps: pkg.devDependencies,
              peerDeps: pkg.peerDependencies,
            },
          ],
        ],
      }),
      nodeResolve({
        mainFields: ["browser", "jsnext:main", "module", "main"],
        nodeResolve: [/^@babel\/.*$/],
      }),
    ],
  });

  const result = await bundle.generate({
    format: "esm",
    name,
  });

  if (result.output.length > 1) {
    info(
      `Failed to generate esm bundle, created multipled bundles instead  - created ${result.output.length}`
    );
    throw new Error(`Failed to generate esm bundle for ${pkg.name}`);
  }

  info(`[${pkg.name}] bundled using Rollup`);

  return result.output[0].code;
}

function exec(cmd, cwd, pkg) {
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
}

function info(message) {
  process.send({
    type: "info",
    message,
  });
}
