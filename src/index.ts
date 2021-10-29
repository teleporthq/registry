import express from "express";
import { buildSync } from "esbuild";
import { GoogleCloud } from "./cloud";
import { generator } from "./generator";
import { camelCaseToDashCase } from "./constants";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { ComponentUIDL, FileType } from "@teleporthq/teleport-types";
import { join } from "path";
const buildPath = join(__dirname, "../build");
import { v4 } from "uuid";

const cloud = new GoogleCloud();
const port = process.env.PORT || 8080;
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.post("/build-package", async (req, res) => {
  const { components = [], entry } = req.body;

  if (!entry) {
    res.sendStatus(400).json({ error: "Entry file is missing" });
  }

  if (components.length === 0) {
    res.sendStatus(400).json({ error: "No components received" });
    return;
  }

  try {
    for (const comp of components) {
      const compUIDL = JSON.parse(comp) as ComponentUIDL;
      const { files } = await generator.generateComponent(compUIDL);
      const base = join(buildPath, camelCaseToDashCase(compUIDL.name));
      if (!existsSync(buildPath)) {
        mkdirSync(buildPath);
      }
      writeFileSync(`${base}.jsx`, files[0].content, "utf-8");
    }

    const entryPath = `${join(buildPath, camelCaseToDashCase(entry))}.jsx`;
    const outfile = join(buildPath, "package.js");
    buildSync({
      bundle: true,
      entryPoints: [entryPath],
      outfile,
      format: "esm",
      jsx: "transform",
      jsxFragment: "Fragment",
      minifyWhitespace: false,
      target: ["es2016"],
      external: ["react", "styled-components"],
    });

    const packageId = v4();
    await cloud.uploadPackage(readFileSync(outfile), packageId);
    res
      .sendStatus(200)
      .json({ id: packageId, url: `https://jscdn.teleporthq.io/${packageId}` });
  } catch (e) {
    console.error(e);
    res.sendStatus(500).json({ error: "Failed in generating component" });
    return;
  }
});

app.get("/", (req, res) => res.send("Package Server"));

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server running on ${port}`);
  });
}

export { app };
