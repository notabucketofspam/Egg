// Oracle setup
import * as OUtil from "../../OUtil.js";
import Oracle from "../../Oracle.d.ts";
// Node setup
import { parentPort } from "node:worker_threads";
// Express setup
import * as Express from "express";
// Handler
export const route = "/admin/restart";
export function exec(request: Express.Request, response: Express.Response) {
  response.send("Restarting...");
  parentPort!.postMessage({ command: "restart", source: "StockPrice", target: "Main" });
}
