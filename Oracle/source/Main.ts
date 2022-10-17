// Node setup
console.log(`process.pid ${process.pid}`);
import path from "node:path";
import fs from "node:fs";
fs.writeFileSync(path.normalize(`${process.cwd()}/log/process.pid`), String(process.pid));
import * as Game from "./Game.js";
// Clean shutdown
process.once("SIGINT", async function (signal) {
  console.log(`Exit Game: ${await Game.terminate()}`);
  console.log(`Exit Main: ${signal}`);
});
