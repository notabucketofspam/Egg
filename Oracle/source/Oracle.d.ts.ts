import * as Express from "express";
import bunyan from "bunyan";
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
   * Loggable version of an Express Request
   */
  interface RequestLogger extends Express.Request {
    logger: bunyan;
  }
  /**
   * Loggable version of an Express Response
   */
  interface ResponseLogger extends Express.Response {
    logger: bunyan;
  }
}
export default Oracle;
