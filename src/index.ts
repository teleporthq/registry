import fs from "fs";
import cors from "cors";
import favicon from "serve-favicon";
import express from "express";
import compression from "compression";
import servePackage from "./serve-package";
import logger from "./logger";
import { root } from "./config";

const app = express();
const port = process.env.PORT || 9000;

app.use(favicon(`${root}/public/favicon.ico`));
app.use(compression());
app.use(cors());

// log requests
app.use((req, res, next) => {
  const remoteAddr = (function () {
    if (req.ip) return req.ip;
    const sock = req.socket;
    if (sock.remoteAddress) return sock.remoteAddress;
    return " - ";
  })();
  const date = new Date().toUTCString();
  const url = req.originalUrl || req.url;
  const httpVersion = req.httpVersionMajor + "." + req.httpVersionMinor;

  logger.info(
    `${remoteAddr} - - [${date}] "${req.method} ${url} HTTP/${httpVersion}"`
  );
  next();
});

app.use(
  express.static(`${root}/public`, {
    maxAge: 600,
  })
);

app.get("/", (req, res) => {
  res.status(200);
  const index = fs.readFileSync(`${root}/server/templates/index.html`, "utf-8");

  res.set("Content-Type", "text/html");
  res.end(index);
});

app.use(servePackage);

if (process.env.NODE_ENV === "development") {
  app.listen(port, () => {
    logger.log(`started at ${new Date().toUTCString()}`);
    console.log("listening on localhost:" + port);
  });
}

export { app };
