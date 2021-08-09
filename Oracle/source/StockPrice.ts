// Oracle setup
import * as OUtil from "./OUtil.js";
import Oracle from "./Oracle.d.ts";
// Node setup
import { parentPort } from "node:worker_threads";
import EventEmitter from "node:events";
import path from "node:path";
// Express setup
import * as Express from "express";
import express from "express";
const app: Express.Application = express();
app.set("case sensitive routing", true);
import cors from "cors";
app.use(cors());
// Logger setup
import bunyan from "bunyan";
const logger = bunyan.createLogger({
  name: "StockPrice",
  serializers: {
    error: bunyan.stdSerializers.err,
    request: bunyan.stdSerializers.req,
    response: bunyan.stdSerializers.res
  },
  streams: [{
    type: "rotating-file",
    path: path.normalize(`${process.cwd()}/log/StockPrice/log`),
    period: "1d",
    count: 12,
  }]
});
import { v4 as uuidv4 } from "uuid";
app.use(function (request: Express.Request, response: Express.Response, next: Express.NextFunction) {
  (request as Oracle.RequestLogger).logger = logger.child({ request_uuid: uuidv4() });
  (response as Oracle.ResponseLogger).logger = logger.child({ response_uuid: uuidv4() });
  //const requestLogger = (request as Oracle.RequestLogger).logger;
  //const responseLogger = (response as Oracle.ResponseLogger).logger;
  next();
});
app.use(function (error: Error, request: Express.Request, response: Express.Response, next: Express.NextFunction) {
  logger.error(error);
  response.sendStatus(500);
});
// HTTP request handlers
app.get("/admin/restart", async function (request: Express.Request, response: Express.Response) {
  response.send("Restarting...");
  parentPort!.postMessage({ command: "restart", source: "StockPrice", target: "Main" });
});
// Listen for requests
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
