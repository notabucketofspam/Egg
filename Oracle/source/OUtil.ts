// Node setup
import { Worker, WorkerOptions } from "node:worker_threads";
import EventEmitter from "node:events";
import path from "node:path";
import fs from "node:fs";
/**
 * Wrapper for a Worker thread with the initialization properties self-embedded.
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
   * @returns {Promise<number>} An exit code
   */
  async terminate() {
    this.worker.postMessage({ command: "terminate" });
    for await (const [message] of EventEmitter.on(this.worker, "message")) {
      if (message.options && message.options.terminated)
        return message.options.code as number;
    }
    return 1;
  }
  /**
   * End thread and create a new one.
   * @returns {Promise<void>} Basically nothing
   */
  async restart() {
    await this.terminate();
    this.worker = new Worker(this.filename, this.options);
    if (this.initializer)
      this.initializer(this.worker, ...this.initArgs);
  }
}
/**
 * Find all files in a directory tree.
 * @param {fs.Dir} dir The current directory
 * @param {string[]} files A list of file paths
 * @returns {Promise<void>} Basically nothing
 */
export async function readdirRecursive(dir: fs.Dir, files: string[]) {
  for await (const dirent of dir) {
    const direntPath = path.normalize(`${dir.path}/${dirent.name}`);
    if (dirent.isDirectory()) {
      await readdirRecursive(fs.opendirSync(direntPath, { encoding: "utf8" }), files);
    } else if (dirent.isFile()) {
      files.push(direntPath);
    }
  }
}
/**
 * Turn a Redis map reply into an object.
 * @param {string[]} reply Alternating list of keys and values
 * @returns {Record<string, string>} New object with each key set to the respective value
 */
export function fromMapReply(reply: string[]) {
  const newobj: Record<string, string> = {};
  for (let index = 0; index < reply.length; index += 2)
    newobj[reply[index]] = reply[index + 1];
  return newobj;
}
