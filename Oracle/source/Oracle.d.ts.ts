import * as Express from "express";
import Logger from "bunyan";
import { ReJSON } from "redis-modules-sdk";
import { Queue, Worker } from "bullmq";
/**
 * Colection of common types, interfaces, etc.
 */
declare module Oracle {
  /**
   * Template message being pased between Worker threads.
   */
  interface ExtWorkerMessage {
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
  interface Oregano {
    /** Bunyan logger */
    logger: Logger;
    /** ReJSON client */
    rejson: ReJSON;
    /** BullMQ queue */
    queue: Queue;
    /** BullMQ worker array */
    workers: Worker[]
  }
}
export default Oracle;
