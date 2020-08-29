import fs from "fs";
import minilog from "minilog";
import { tmpdir } from "./config";

minilog.enable();
minilog.pipe(fs.createWriteStream(`${tmpdir}/log`));

export default minilog("teleport-packer");
