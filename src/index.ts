import express from "express";
import { transformSync } from "@swc/core";
import { generator } from "./generator";
import GoogleCloud from "./cloud";
import { ComponentUIDL } from "@teleporthq/teleport-types";

const googleCloud = new GoogleCloud();
const port = process.env.PORT || 8080;
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/:packageName", async (req, res) => {
  const { packageName } = req.params;
  const pacakgeContent = googleCloud.fetchPackage(packageName);

  res
    .status(200)
    .setHeader("Content-Type", "application/json")
    .send(pacakgeContent);
});

app.post("/component", async (req, res) => {
  const {
    uidl,
  }: {
    uidl: string;
  } = req.body;

  try {
    const compUIDL: ComponentUIDL = JSON.parse(uidl);
    const { files } = await generator.generateComponent(compUIDL);
    const parsedResult = transformSync(files[0].content, {
      jsc: {
        target: "es2016",
        parser: {
          syntax: "ecmascript",
          jsx: true,
          dynamicImport: false,
          numericSeparator: false,
          privateMethod: true,
          functionBind: false,
          exportDefaultFrom: false,
          exportNamespaceFrom: false,
          decorators: false,
          decoratorsBeforeExport: false,
          topLevelAwait: false,
          importMeta: false,
        },
      },
    });
    const result = await googleCloud.uploadPackage(
      parsedResult.code,
      compUIDL.name
    );
    console.log(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed in generating component" });
  }
});

app.get("/", (req, res) => res.send("Package Server"));

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server running on ${port}`);
  });
}

export { app };
