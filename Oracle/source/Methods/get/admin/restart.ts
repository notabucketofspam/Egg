// Node setup
import { parentPort } from "node:worker_threads";
// Express setup
import * as Express from "express";
// Handler
export const method = "get";
export const route = "/admin/restart";
export async function exec(request: Express.Request, response: Express.Response) {
  response.send("(Not) Restarting...");
  //parentPort!.postMessage({ command: "restart", source: "StockPrice", target: "Main" });
}
