// Oracle setup
import * as OUtil from "./OUtil.js";
import Oracle from "./Oracle.d.ts";
// Node setup
import { parentPort } from "node:worker_threads";
import EventEmitter from "node:events";
import path from "node:path";
import fs from "fs";
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
    period: "1d",
    count: 12
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
for (let index = 0; index < 8; ++index)
  workers.push(new Worker(`worker_${index}`));
// Middleware setup
import { v4 as uuidv4 } from "uuid";
app.use(function (request: Express.Request, response: Express.Response, next: Express.NextFunction) {
  response.locals.oregano = {
    logger: logger.child({ uuid: uuidv4() }),
    rejson,
    queue,
    workers
  };
  next();
});
// HTTP request handlers
// Hat tip to Discord.js Guide for the dynamic import idea.
const methodFolders = fs.readdirSync(path.normalize(`${process.cwd()}/build/Methods`));
methodFolders.forEach(async function (method) {
  const handlerFiles = fs.readdirSync(path.normalize(`${process.cwd()}/build/Methods/${method}`))
    .filter(file => file.endsWith(".js"));
  handlerFiles.forEach(async function (handlerFile) {
    const handler = await import(path.normalize(`file://${process.cwd()}/build/Methods/${method}/${handlerFile}`));
    (app as any)[method](handler.route, handler.exec);
  });
});
// Error handling
app.use(function (error: Error, request: Express.Request, response: Express.Response, next: Express.NextFunction) {
  logger.error(error);
  response.status(500).send(error.stack);
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
    await queue.close();
    await rejson.disconnect();
    parentPort!.off("message", commandRegister.exec);
    parentPort!.postMessage({ command: "nothing", source: "StockPrice", target: "Main", options: { code: 0 } });
  }
};
// Apparently TSC thinks it's imperative for parentPort to be non-null
parentPort!.on("message", commandRegister.exec);
