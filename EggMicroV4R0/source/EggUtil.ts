// Thanks to here for making ObjectType unnecessary: https://stackoverflow.com/a/44441178
import * as fs from "fs";
import Base from "deta/dist/types/base";
/**
 * Bunch of semi-useful / oddly-specific tools
 */
namespace EggUtil {
  /**
   * Basically just an array with a few more features (i.e. extendability)
   */
  export class ExtArray<T> extends Array<T> {
    constructor(...items: T[]) {
      super(...items);
    }
    /**
     * Stick another array on the end of this one
     * Partially taken from here and here:
     * https://stackoverflow.com/a/17368101
     * https://stackoverflow.com/a/26633883
     * @param {T[]} otherArray The other array to merge with
     * @returns {ExtArray<T>} itself, so that it can be chained
     */
    extend(otherArray: T[]) {
      if (Array.isArray(otherArray)) {
        const self = this;
        otherArray.forEach(function (item: T) {
          self.push(item);
        });
      } else {
        throw new TypeError("otherArray is not an array");
      }
      return this;
    }
    /**
     * Leech items from one array into another
     * @param {T[]} otherArray The array to take items from
     * @returns {ExtArray<T>} itself, for chaining
     */
    drain(otherArray: T[]) {
      if (Array.isArray(otherArray)) {
        while (otherArray.length)
          this.push(otherArray.shift() as T);
      } else {
        throw new TypeError("otherArray is not an array");
      }
      return this;
    }
    /**
     * Get the final item in the array
     * @returns {T} The last item
     */
    last() {
      return this[this.length - 1];
    }
  }
  /**
   * Race a promise against the clock
   * Modified from here:
   * https://spin.atomicobject.com/2020/01/16/timeout-promises-nodejs/
   * @param {number} timeoutMs How long it'll wait before rejecting
   * @param {string} failureMessage What to display upon rejection
   * @param {(...args: any[]) => Promise<T>} promise The promise-returning function
   * @param {any[]} [args] The arguments for the promise
   * @returns {Promise<T>} Promise which may or may not have been rejected
   */
  function promiseWithTimeout<T>(timeoutMs: number, failureMessage: string, promise: (...args: any[]) => Promise<T>,
    ...args: any[]) {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((resolve, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(failureMessage)), timeoutMs);
    });
    return Promise.race([
      promise(...args),
      timeoutPromise,
    ]).then(function (result) {
      clearTimeout(timeoutHandle);
      return result;
    });
  }
  /**
   * Used with acquireLock() function
   * @returns {Promise<boolean>} Some sort of Promise
   */
  function lockPromise() {
    return new Promise<boolean>(function (resolve, reject) {
      while (fs.existsSync("/tmp/lock.txt"));
      fs.appendFileSync("/tmp/lock.txt", "locked");
      resolve(true);
    });
  }
  /**
   * Try to lock the DB from other requests accessing it
   * Probably doesn't work as intended, who knows
   * @returns {Promise<boolean>} Promise that says whether or not the lock was acquired
   */
  export function acquireLock() {
    // Not 10000ms below because otherwise the Micro might time out
    return promiseWithTimeout(8533, "Unable to acquire lock", lockPromise);
  }
  /**
   * Release the lock on the DB
   */
  export function releaseLock() {
    fs.unlinkSync("/tmp/lock.txt");
  }
  /**
   * A user-entered form submission
   */
  export interface Submission {
    extraData: Record<string, any>;
    industry: string;
    key: string;
    stockCountEnd: number;
    stockCountStart: number;
    territory: string;
    timestamp: number;
    winLose: boolean;
  }
  /**
   * Grab the last couple of submissions using Deta's suboptimal <1.0.0 Base API
   * @param {Base} database The Deta Base to utilize
   * @param {string} industry Whatever industry you're looking for
   * @param {number} [inclusionRange=4] How many results to return
   * @returns {Promise<ExtArray<Submission>[]>} ExtArray with a handful of submisions and some stuff to delete
   */
  export async function fetchLastIndustryResults(database: Base, industry: string, inclusionRange = 4) {
    const results = new ExtArray<Submission>();
    const deletables = new ExtArray<Submission>();
    const fetchResponse = await (database.fetch as any)({ industry }, Infinity, 4266);
    for await (const buffer of fetchResponse)
      deletables.extend(results.extend(buffer).sort((a, b) => b.timestamp - a.timestamp).splice(inclusionRange));
    return [results.reverse() as typeof results, deletables];
  }
  /**
   * List of what territories belong to which industries
   */
  export const industryRegistry: Record<string, string[]> = {
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
   * Verify integrity of user-submitted data
   * @param {Submission} submission The form submission to validate
   * @returns {string[]} List of problems found with the submission
   */
  export function errorCheck(submission: Submission) {
    const errorMessages: string[] = [];
    // All properties of submission must exist
    if (!(typeof submission === "object" && Object.keys(submission).length !== 0)) {
      errorMessages.push("submission is either not an object or contains no data.");
      return errorMessages;
    }
    const extraDataExists = typeof submission.extraData === "object" &&
      Object.keys(submission.extraData).length === 0;
    if (!extraDataExists)
      errorMessages.push("extraData is either not an object or contains invalid data.");
    const industryExists = typeof submission.industry === "string";
    if (!industryExists)
      errorMessages.push("industry is not a string.");
    const stockCountEndExists = typeof submission.stockCountEnd === "number";
    if (!stockCountEndExists)
      errorMessages.push("stockCountEnd is not a number.");
    const stockCountStartExists = typeof submission.stockCountStart === "number";
    if (!stockCountStartExists)
      errorMessages.push("stockCountStart is not a number.");
    const territoryExists = typeof submission.territory === "string";
    if (!territoryExists)
      errorMessages.push("territory is not a string.");
    const timestampExists = typeof submission.timestamp === "number";
    if (!timestampExists)
      errorMessages.push("timestamp is not a number.");
    const winLoseExists = typeof submission.winLose === "boolean";
    if (!winLoseExists)
      errorMessages.push("winLose is not a boolean.");
    // Numeric values must be in range
    const stockCountEndInRange = stockCountEndExists && submission.stockCountEnd >= 0 &&
      submission.stockCountEnd <= 10;
    const stockCountStartInRange = stockCountStartExists && submission.stockCountStart >= 1 &&
      submission.stockCountStart <= 10;
    const timestampInRange = timestampExists && submission.timestamp <= Date.now();
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
      if (!Object.keys(industryRegistry).includes(submission.industry))
        errorMessages.push(`${submission.industry} is not an industry.`);
      else if (territoryExists && !industryRegistry[submission.industry].includes(submission.territory))
        errorMessages.push(`${submission.industry} does not contain ${submission.territory}.`);
    // Won with zero stocks left
    if (winLoseExists && stockCountEndInRange && submission.winLose && submission.stockCountEnd === 0)
      errorMessages.push("Cannot win with zero stocks left.");
    // Ended with more stocks than started with
    if (stockCountEndInRange && stockCountStartInRange && submission.stockCountEnd > submission.stockCountStart)
      errorMessages.push("Cannot end with more stocks than started with.");
    return errorMessages;
  }
}
export default EggUtil;
