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
    constructor() {
      super();
    }
    /**
     * Stick another array on the end of this one
     * Partially taken from here and here:
     * https://stackoverflow.com/a/17368101
     * https://stackoverflow.com/a/26633883
     * @param {any[]} otherArray The other array to merge with
     * @returns {ExtendableArray<T>} itself, so that it can be chained
     */
    extend(otherArray: any[]) {
      if (Array.isArray(otherArray)) {
        const self = this;
        otherArray.forEach(function (item: any) {
          self.push(item);
        });
      } else {
        throw new TypeError("otherArray is not an array");
      }
      return this;
    }
    /**
     * Leech items from one array into another
     * @param {any[]} otherArray The array to take items from
     * @returns {ExtendableArray<T>} itself, for chaining
     */
    drain(otherArray: any[]) {
      if (Array.isArray(otherArray)) {
        while (otherArray.length)
          this.push(otherArray.shift());
      } else {
        throw new TypeError("otherArray is not an array");
      }
      return this;
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
      promise(args),
      timeoutPromise,
    ]).then((result) => {
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
    key: string;
    extraData: Record<string, any>;
    industry: string;
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
   * @returns {Promise<ExtArray<Submission>>} Array with a handful of submisions
   */
  export async function fetchLastIndustryResults(database: Base, industry: string, inclusionRange = 4) {
    const results = new ExtArray<Submission>();
    const deletables = new ExtArray<Submission>();
    const fetchResponse = await (database.fetch as any)({ industry }, Infinity, 4266);
    // results is spliced early so that there are only inclusionRange number
    // of items in it after every iteration; this prevents results from
    // growing too large and crashing the app
    for await (const buffer of fetchResponse)
      deletables.extend(results.extend(buffer).sort((a, b) => b.timestamp - a.timestamp).splice(inclusionRange));
    return [results.reverse() as typeof results, deletables];
  }
}
export default EggUtil;
