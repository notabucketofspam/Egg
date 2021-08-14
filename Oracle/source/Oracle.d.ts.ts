// Oracle setup
import * as OUtil from "./OUtil.js"
// Other setup
import * as Express from "express";
import Logger from "bunyan";
import { ReJSON } from "redis-modules-sdk";
import { Queue, Worker } from "bullmq";
/**
 * Template message being pased between Worker threads.
 */
export interface ExtWorkerMessage {
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
export interface Oregano {
  /** Bunyan logger */
  logger: Logger;
  /** ReJSON client */
  rejson: ReJSON;
  /** BullMQ queue */
  queue: Queue;
  /** BullMQ worker array */
  workers: Worker[]
}
/**
 * Express middleware for a specific route
 */
export interface HttpRequestHandler {
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
export type OUtilType = {
  /** Wrapper for a Worker thread. */
  ExtWorker: typeof OUtil.ExtWorker;
  /** Find files in subdirectory. */
  readdirRecursive: typeof OUtil.readdirRecursive;
};
