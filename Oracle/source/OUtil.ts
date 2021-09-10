// Oracle setup
import * as Oracle from "Oracle";
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
 * Which territories are in what industry.
 */
const industryRegistry: Record<string, string[]> = {
  Black: ["Charlie", "Kilo", "Romeo", "Zulu"],
  Blue: ["Zero", "One"],
  Brown: ["Alpha", "Bravo"],
  Cyan: ["Delta", "Echo", "Foxtrot"],
  Green: ["Whiskey", "X-ray", "Yankee"],
  Magenta: ["Golf", "India", "Juliett"],
  Orange: ["Lima", "Mike", "November"],
  Red: ["Oscar", "Papa", "Quebec"],
  White: ["Hotel", "Uniform"],
  Yellow: ["Sierra", "Tango", "Victor"]
};
/**
 * Verify user submission.
 * @param {Oracle.Submission} submission The form submission to validate
 * @returns {string[]} List of problems found with the submission, if any
 */
export function errorCheck(submission: Oracle.Submission) {
  const errorMessages: string[] = [];
  // All properties of submission must exist
  if (!(typeof submission === "object" && Object.keys(submission).length)) {
    errorMessages.push("submission is either not an object or contains no data.");
    return errorMessages;
  }
  const industryExists = typeof submission.ind === "string";
  if (!industryExists)
    errorMessages.push("ind is not a string.");
  const stockCountEndExists = typeof submission.end === "number";
  if (!stockCountEndExists)
    errorMessages.push("end is not a number.");
  const stockCountStartExists = typeof submission.start === "number";
  if (!stockCountStartExists)
    errorMessages.push("start is not a number.");
  const territoryExists = typeof submission.terr === "string";
  if (!territoryExists)
    errorMessages.push("terr is not a string.");
  const timestampExists = typeof submission.time === "number";
  if (!timestampExists)
    errorMessages.push("time is not a number.");
  const winExists = typeof submission.win === "boolean";
  if (!winExists)
    errorMessages.push("win is not a boolean.");
  // Numeric values must be in range
  const stockCountEndInRange = stockCountEndExists && submission.end >= 0 &&
    submission.end <= 10;
  const stockCountStartInRange = stockCountStartExists && submission.start >= 1 &&
    submission.start <= 10;
  const timestampInRange = timestampExists && submission.time <= Date.now();
  // Timestamp out of range
  if (timestampExists && !timestampInRange)
    errorMessages.push("Timestamp out of range.");
  // Stock count end out of range
  if (stockCountEndExists && !stockCountEndInRange)
    errorMessages.push("Stock count end out of range.");
  // Stock count start out of range
  if (stockCountStartExists && !stockCountStartInRange)
    errorMessages.push("Stock count start out of range.");
  // Not an industry or territory
  if (industryExists)
    if (!Object.keys(industryRegistry).includes(submission.ind))
      errorMessages.push(`${submission.ind} is not an industry.`);
    else if (territoryExists && !industryRegistry[submission.ind].includes(submission.terr))
      errorMessages.push(`${submission.ind} does not contain ${submission.terr}.`);
  // Won with zero stocks left
  if (winExists && stockCountEndInRange && submission.win && submission.end === 0)
    errorMessages.push("Cannot win with zero stocks left.");
  // Ended with more stocks than started with
  if (stockCountEndInRange && stockCountStartInRange && submission.end > submission.start)
    errorMessages.push("Cannot end with more stocks than started with.");
  return errorMessages;
}
