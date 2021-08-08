// Node setup
import { parentPort } from "node:worker_threads";
import EventEmitter from "node:events";
// Express setup
import * as Express from "express";
import express from "express";
const app: Express.Application = express();
app.set("case sensitive routing", true);
import cors from "cors";
app.use(cors());
app.get("/admin/restart", async function (request: Express.Request, response: Express.Response) {
  response.send("Restarting...");
  parentPort!.postMessage({ command: "restart", source: "StockPrice", target: "Main" });
});
const server = app.listen(39000, "localhost");
/** List of commands known to this Worker thread. */
const commandRegister: Record<string, (message: Oracle.ExtWorkerMessage) => any> = {
  /**
   * Execute one of the known commands.
   * @param {Oracle.ExtWorkerMessage} message Gathered from parentPort
   */
  exec(message) {
    commandRegister[message.command](message);
  },
  /**
   * Delete thread.
   */
  async terminate() {
    server.close();
    await EventEmitter.once(server, "close");
    parentPort!.off("message", commandRegister.exec);
    parentPort!.postMessage({ command: "nothing", source: "StockPrice", target: "Main", options: { code: 0 } });
  }
};
// Apparently TSC thinks it's imperative for parentPort to be non-null
parentPort!.on("message", commandRegister.exec);
