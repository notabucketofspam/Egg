// Oracle setup
import * as OUtil from "./OUtil.js";
import * as Oracle from "./Oracle.d.ts";
// Node setup
import { parentPort } from "node:worker_threads";
import EventEmitter from "node:events";
import path from "node:path";
import fs from "node:fs";
// Express setup
import * as Express from "express";
import express from "express";
const app: Express.Application = express();
app.set("case sensitive routing", true);
import cors from "cors";
app.use(cors());
// Logger setup
import Logger from "bunyan";
const logger = Logger.createLogger({
  name: "StockPrice",
  serializers: {
    error: Logger.stdSerializers.err,
    request: Logger.stdSerializers.req,
    response: Logger.stdSerializers.res
  },
  streams: [{
    type: "rotating-file",
    path: path.normalize(`${process.cwd()}/log/StockPrice/log`),
    period: "6h",
    count: 48
  }]
});
// Redis setup
import { ReJSON } from "redis-modules-sdk";
const rejson = new ReJSON({});
await rejson.connect();
// BullMQ setup
import { Queue, Worker } from "bullmq";
const queue = new Queue("StockPrice");
const workers: Worker[] = [];
const workerCount = 8;
for (let index = 0; index < workerCount; ++index)
  workers.push(new Worker(`worker_${index}`));
// Middleware setup
app.locals.oregano = {
  logger,
  rejson,
  queue,
  workers
};
import { v4 as uuidv4 } from "uuid";
app.use(function (request: Express.Request, response: Express.Response, next: Express.NextFunction) {
  response.locals.logger = logger.child({ uuid: uuidv4() });
  next();
});
// HTTP request handlers
const methodsDir = fs.opendirSync(path.normalize(`${process.cwd()}/build/Methods`), { encoding: "utf8" });
const handlerFiles: string[] = [];
await OUtil.readdirRecursive(methodsDir, handlerFiles);
handlerFiles.forEach(await async function (handlerFile) {
  const handler: Oracle.HttpRequestHandler = await import(path.normalize(`file://${handlerFile}`));
  (app as any)[handler.method](handler.route, handler.exec);
});
// Error handling middleware
app.use(function (error: Error, request: Express.Request, response: Express.Response, next: Express.NextFunction) {
  logger.error(error);
  const errorStack = error.stack ? error.stack : `Some sort of error occurred:\n${String(error)}`;
  response.status(500).send(errorStack);
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
    const promiseArray: Promise<any>[] = [];
    server.close();
    promiseArray.push(EventEmitter.once(server, "close"));
    promiseArray.push(queue.close());
    for (let index = 0; index < workerCount; ++index)
      promiseArray.push(workers[index].close());
    promiseArray.push(rejson.disconnect());
    await Promise.all(promiseArray);
    parentPort!.off("message", commandRegister.exec);
    parentPort!.postMessage({ command: "nothing", source: "StockPrice", target: "Main", options: { code: 0 } });
  }
};
// Apparently TSC thinks it's imperative for parentPort to be non-null
parentPort!.on("message", commandRegister.exec);
