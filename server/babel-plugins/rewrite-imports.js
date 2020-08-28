function rewriteImport(babelCore, params) {
  const deps = {
    ...params.deps,
    ...params.peerDeps,
  };

  return {
    visitor: {
      ImportDeclaration: function (path, state) {
        const source = path.node.source.value;

        if (source.includes("@babel/runtime")) {
          return;
        } else {
          if (
            (!source.includes("https://") || !source.includes("http")) &&
            deps[source]
          ) {
            path.node.source.value = `http://localhost:9000/${source}@${deps[source]}`;
          }

          // Package is used but not mentioned
          // if (
          //   (!source.includes("https://") || !source.includes("http")) &&
          //   !deps[source] &&
          //   !source.startsWith(".")
          // ) {
          //   path.node.source.value = `http://localhost:9000/${source}@latest`;
          // }
        }
      },
    },
  };
}

module.exports = rewriteImport;
