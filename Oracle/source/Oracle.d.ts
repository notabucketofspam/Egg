// Oracle setup
import * as OUtil from "./OUtil.js"
// Other setup
import * as Express from "express";
import Logger from "bunyan";
import { Redis } from "ioredis";
import { ReJSON, Redisearch } from "redis-modules-sdk";
import { Queue, QueueScheduler, Worker } from "bullmq";
/**
 * Template message being pased between Worker threads.
 */
declare interface ExtWorkerMessage {
  /** The command to execute on the target. */
  command: string;
  /** Name of the Worker thread sending this message. */
  source: string;
  /** Name of the Worker thread this message is being sent to. */
  target: string;
  /** Any additional parameters that might be useful. */
  options: Record<string, any>;
}
/**
 * This was originally ORegister, but Oregano is funnier.
 */
declare interface Oregano {
  /** Bunyan logger */
  logger: Logger;
  /** IORedis client */
  ioredis: Redis;
  /** List of Lua script hashes */
  scripts: Record<string, string>;
  /** ReJSON client */
  rejson: ReJSON;
  /** RediSearch client */
  redisearch: Redisearch;
  /** BullMQ queue */
  queue: Queue;
  /** BullMQ queue scheduler */
  queueScheduler: QueueScheduler;
  /** BullMQ worker array */
  workers: Worker[];
}
/**
 * Express middleware for a specific route.
 */
declare interface HttpRequestHandler {
  /** HTTP verb */
  method: string;
  /** Request path */
  route: string;
  /** The handler function itself */
  exec: (request: Express.Request, response: Express.Response) => Promise<void>;
}
/**
 * Wrapper type for OUtil to allow lazy importing.
 * See OUtil.ts for documentation.
 */
declare type OUtilType = {
  /** Wrapper for a Worker thread. */
  ExtWorker: typeof OUtil.ExtWorker;
  /** Find files in subdirectory. */
  readdirRecursive: typeof OUtil.readdirRecursive;
};
/**
 * List of commands known to a thread or handler.
 */
declare interface CommandRegister {
  [command: string]: (...args: any) => any;
}
/**
 * Number of the Redis database to use for a connection.
 */
declare const enum RedisDB {
  StockPrice,
  BullMQ
}
/**
 * Command to execute in the context of HTTP requests.
 */
declare interface HttpRequestCommand {
  /** Name of the command */
  name: string;
  /** Function which returns a Promise for the HTTP status code and a sendable response body */
  exec: (request: Express.Request, response: Express.Response) => Promise<[
    status: number,
    send: Record<string, any>
  ]>;
}
/**
 * The form submission from any user.
 */
declare interface Submission {
  /** Stock count end */
  end: number;
  /** Industry */
  ind: string;
  /** Stock count start */
  start: number
  /** Territory */
  terr: string;
  /** Timestamp */
  time: number;
  /** Win */
  win: boolean;
}
