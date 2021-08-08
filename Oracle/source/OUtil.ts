// Node setup
import { Worker, WorkerOptions } from "node:worker_threads";
import EventEmitter from "node:events";
/**
 * Wrapper for a Worker thread with the initialization properites self-embedded.
 */
export class ExtWorker {
  /**
   * Instantiate a Worker thread and optionally give it some initial settings.
   * @param {string} filename Path to the JavaScript file for the Worker thread
   * @param {WorkerOptions=} options Default settings for the Worker thread
   * @param {(worker: Worker, ...args: any[]) => void=} initializer Apply any additional settings
   * @param {any[]} initArgs Parameters for the initializer
   */
  constructor(filename: string, options?: WorkerOptions, initializer?: (worker: Worker, ...args: any[]) => void,
    ...initArgs: any[]) {
    this.worker = new Worker(filename, options);
    this.filename = filename;
    this.options = options;
    this.initializer = initializer;
    this.initArgs = initArgs;
    if (this.initializer)
      this.initializer(this.worker, ...this.initArgs);
  }
  /** The Worker thread in question. */
  worker: Worker;
  /** Path to the JS file. */
  filename: string;
  /** Default options for the Worker thread. */
  options?: WorkerOptions;
  /** Function that is run once when the Worker therad is instantiated. */
  initializer?: (worker: Worker, ...args: any[]) => void;
  /** Arguments passed to the initializer. */
  initArgs: any[];
  /**
   * End the Worker thread.
   * @returns {Promise<any[]>} An exit code
   */
  terminate() {
    this.worker.postMessage({ command: "terminate" });
    return EventEmitter.once(this.worker, "message");
  }
  /**
   * End thread and create a new one.
   */
  async restart() {
    await this.terminate();
    this.worker = new Worker(this.filename, this.options);
    if (this.initializer)
      this.initializer(this.worker, ...this.initArgs);
  }
}
