import * as fs from "fs";
/**
 * Bunch of semi-useful / oddly-specific tools
 */
namespace EggUtil {
  /**
   * Basically just an array that can have other arrays slapped onto it
   * Partially taken from here and here:
   * https://stackoverflow.com/questions/1374126/how-to-extend-an-existing-javascript-array-with-another-array-without-creating/17368101#17368101
   * https://stackoverflow.com/questions/767486/how-do-you-check-if-a-variable-is-an-array-in-javascript
   */
  export class ExtendableArray extends Array {
    constructor() {
      super();
    }
    /**
     * Stick another array on the end of this one
     * @param {any[]} otherArray The other array to merge with
     * @returns {StockPrice.ExtendableArray} itself, so that it can be chained
     */
    extend(otherArray: any[]) {
      if (Array.isArray(otherArray)) {
        const newLocal = this;
        otherArray.forEach(function (item) {
          newLocal.push(item);
        });
      } else {
        throw new TypeError("otherArray is not an array");
      }
      return this;
    }
    /**
     * Leech items from one array into another
     * @param {any[]} otherArray The array to take items from
     * @returns {StockPrice.ExtendableArray} itself, for chaining
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
   * A user-entered form submission
   */
  export interface Submission {
    key: string;
    extraData: Object;
    industry: string;
    stockCountEnd: number;
    stockCountStart: number;
    territory: string;
    timestamp: number;
    winLose: boolean;
  }
  /**
   * Race a promise against the clock
   * Taken directly from:
   * https://spin.atomicobject.com/2020/01/16/timeout-promises-nodejs/
   * @param {number} timeoutMs How long it'll wait before rejecting
   * @param {() => Promise<T>} promise The promise-returning function
   * @param {string} failureMessage What to display upon rejection
   * @returns {Promise<T>} Promise which may or may not have been rejected
   */
  const promiseWithTimeout = <T>(timeoutMs: number, promise: () => Promise<T>, failureMessage?: string) => {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((resolve, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(failureMessage)), timeoutMs);
    });
    return Promise.race([
      promise(),
      timeoutPromise,
    ]).then((result) => {
      clearTimeout(timeoutHandle);
      return result;
    });
  }
  /**
   * Used with acquireLock function
   * @returns {Promise<unknown>} Some sort of Promise
   */
  function lockPromise() {
    return new Promise(function (resolve, reject) {
      while (fs.existsSync("/tmp/lock.txt"));
      fs.appendFileSync("/tmp/lock.txt", "locked");
      resolve(true);
    });
  };
  /**
   * Try to lock the DB from other requests accessing it
   * Probably doesn't work as intended, who knows
   * @returns {Promise<boolean>} Promise that says whether or not the lock was acquired
   */
  export function acquireLock() {
    // Not 10000ms below because otherwise the micro might time out
    return promiseWithTimeout(8666, lockPromise, "Unable to acquire lock");
  }
  /**
   * Release the lock on the DB
   * @returns {void} Absolutely nothing (since this theoretically can't fail)
   */
  export function releaseLock() {
    fs.unlinkSync("/tmp/lock.txt");
  }
}
export default EggUtil;
