// Oracle setup
import * as Oracle from "Oracle";
import * as OUtil from "./OUtil.js";
// Node setup
console.log(`process.pid ${process.pid}`);
import { Worker } from "node:worker_threads";
import path from "node:path";
import fs from "node:fs";
fs.writeFileSync(path.normalize(`${process.cwd()}/log/process.pid`), String(process.pid));
/** List of Worker threads known to Main */
const workerRegister: Record<string, OUtil.ExtWorker> = {};
/** List of commands known to Main */
const commandRegister: Oracle.CommandRegister = {
  /** Do nothing. */
  nothing() { },
  /**
   * Restart the specified Worker thread upon request.
   * @param {Oracle.ExtWorkerMessage} message Sent from a Worker thread
   */
  restart(message: Oracle.ExtWorkerMessage) {
    workerRegister[message.source].restart();
  }
};
/**
 * Allow messages to be sent between Worker threads by using parentPort.
 * @param {Worker} worker The Worker thread to attach an event listener to
 */
function messagePass(worker: Worker) {
  worker.on("message", function (message: Oracle.ExtWorkerMessage) {
    if (message.target === "Main")
      commandRegister[message.command](message);
    else
      workerRegister[message.target].worker.postMessage(message);
  });
}
workerRegister["StockPrice"] = new OUtil.ExtWorker(path.normalize(`${process.cwd()}/build/StockPrice.js`), { },
  messagePass);
// Clean shutdown
process.once("SIGINT", async function (signal) {
  console.log(`Exit StockPrice: ${await workerRegister["StockPrice"].terminate()}`);
  console.log(`Exit Main: ${signal}`);
});
