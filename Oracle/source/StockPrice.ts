// Oracle setup
import * as Oracle from "Oracle";
import * as OUtil from "./OUtil.js";
// Node setup
import { parentPort } from "node:worker_threads";
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
import IORedis from "ioredis";
const ioredis = new IORedis({ db: Oracle.RedisDB.StockPrice });
const scripts: Record<string, string> = {};
do {
  const luaDir = fs.opendirSync(path.normalize(`${process.cwd()}/lua`), { encoding: "utf8" });
  const scriptFiles: string[] = [];
  await OUtil.readdirRecursive(luaDir, scriptFiles);
  await Promise.all(scriptFiles.map(async function (scriptFile) {
    scripts[path.basename(scriptFile, ".lua")] = await ioredis.script("LOAD",
      fs.readFileSync(scriptFile, { encoding: "utf8" }));
  }));
} while (0);
// Redis module setup
import { ReJSON, Redisearch } from "redis-modules-sdk";
const rejson = new ReJSON({ db: Oracle.RedisDB.StockPrice });
await rejson.connect();
const redisearch = new Redisearch({ db: Oracle.RedisDB.StockPrice });
await redisearch.connect();
// BullMQ setup
import { Queue, QueueScheduler, Worker } from "bullmq";
const queue = new Queue("StockPrice", { connection: { db: Oracle.RedisDB.BullMQ } });
const queueScheduler = new QueueScheduler("QueueScheduler", { connection: { db: Oracle.RedisDB.BullMQ } });
const workers: Worker[] = [];
for (let index = 0; index < 8; ++index)
  workers.push(new Worker(`Worker_${index}`, undefined, { connection: { db: Oracle.RedisDB.BullMQ } }));
// Middleware setup
app.locals.oregano = {
  logger,
  ioredis,
  scripts,
  rejson,
  redisearch,
  queue,
  queueScheduler,
  workers
};
import { v4 as uuidv4 } from "uuid";
app.use(function (request: Express.Request, response: Express.Response, next: Express.NextFunction) {
  response.locals.logger = logger.child({ uuid: uuidv4() });
  next();
});
// HTTP request handlers
// Parallel assignment from: https://stackoverflow.com/a/37576787
do {
  const methodsDir = fs.opendirSync(path.normalize(`${process.cwd()}/build/Methods`), { encoding: "utf8" });
  const handlerFiles: string[] = [];
  await OUtil.readdirRecursive(methodsDir, handlerFiles);
  await Promise.all(handlerFiles.map(async function (handlerFile) {
    const handler: Oracle.HttpRequestHandler = await import(path.normalize(`file://${handlerFile}`));
    (app as any)[handler.method](handler.route, handler.exec);
  }));
} while (0);
// Error handling middleware
app.use(function (error: Error, request: Express.Request, response: Express.Response, next: Express.NextFunction) {
  logger.error(error);
  const errorStack = error.stack ? error.stack : `Some sort of error occurred:\n${String(error)}`;
  response.status(500).send(errorStack);
});
// Listen for requests
const server = app.listen(39000, "localhost");
/** List of commands known to this Worker thread. */
const commandRegister: Oracle.CommandRegister = {
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
    let code = 0;
    await Promise.all<void>([
      new Promise<void>(resolve => void server.close(() => resolve())),
      queue.close(),
      queueScheduler.close(),
      ...(workers.map(worker => worker.close())),
      rejson.disconnect(),
      redisearch.disconnect(),
      new Promise<void>(resolve => ioredis.script("FLUSH", () => ioredis.quit(() => resolve())))
    ]).catch<void>(() => void (code = 1));
    parentPort!.off("message", commandRegister.exec);
    parentPort!.postMessage({
      command: "nothing", source: "StockPrice", target: "Main", options: {
        terminated: true,
        code
      }
    });
  }
};
// Apparently TSC thinks it's imperative for parentPort to be non-null
parentPort!.on("message", commandRegister.exec);
