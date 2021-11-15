import express from "express";
import morgan from "morgan";
import { component } from "./modules/component";
import { globals } from "./modules/global";
import { tokens } from "./modules/tokens";

const port = process.env.PORT || 8080;
const app = express();

app.use(morgan("combined"));
app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.post("/tokens", tokens);
app.post("/globals", globals);
app.post("/component", component);

app.get("/", (req, res) => res.send("Package Server"));

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server running on ${port}`);
  });
}

export { app };
