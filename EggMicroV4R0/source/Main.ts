// Deta setup
import Base from "deta/dist/types/base";
import { ObjectType } from "deta/dist/types/types/basic";
const { Deta } = require("deta");
const eggbase: Base = Deta().Base("EggBase");
// Express setup
import path = require("path");
import * as Express from "express";
import express = require("express");
const webapp: Express.Application = express();
webapp.enable("case sensitive routing");
webapp.use(express.urlencoded());
// Deal with static HTML page requests
webapp.use(express.static(path.join(`${__dirname}/../html`)));
/**
 * Race a promise against the clock
 * Taken directly from:
 * https://spin.atomicobject.com/2020/01/16/timeout-promises-nodejs/
 * @param {number} timeoutMs How long it'll wait before rejecting
 * @param {() => Promise<t>} promise The promise-returning function
 * @param {string} failureMessage What to display upon rejection
 * @returns {Promise<t>} Promise which may or may not have been rejected
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
import * as fs from "fs";
/**
 * Try to lock eggbase from other requests accessing it
 * Probably doesn't work as intended, who knows
 * @returns {Promise<boolean>} Promise that says whether or not the lock was acquired
 */
async function acquireLock() {
  const lockPromise = function () {
    return new Promise(async function (resolve, reject) {
      while (fs.existsSync("/tmp/lock.txt"));
      fs.appendFileSync("/tmp/lock.txt", "locked");
      resolve(0);
    });
  };
  let lockSuccess = true;
  await promiseWithTimeout(9750, lockPromise, "Unable to acquire lock")
  .catch(function () {
    lockSuccess = false;
  });
  return lockSuccess;
}
/**
 * Release the lock on eggbase
 * @returns {void} Absolutely nothing (since this theoretically can't fail)
 */
function releaseLock() {
  fs.rmSync("/tmp/lock.txt");
}
import SPC from "./StockPriceCalculator";
webapp.post("/submit", async function (request: Express.Request, response: Express.Response) {
  // FIX sanitize form submission
  if (!await acquireLock()) {
    response.sendStatus(500);
    return;
  }
  const key = ((await eggbase.put(JSON.parse(request.body))) as ObjectType).key as string;
  // TODO do stock price calculations
  // `fetch the relevant industry results somehow...`
  // const stockPriceDelta = SPD.delta(`put something here`);
  // let stockPriceUpdates = { };
  // Loop over stockPriceUpdates adding stuff like this:
  // stockPriceUpdates[stockName] = eggbase.util.increment(stockPriceDelta);
  // stockName must be a string
  // eggbase.update(stockPriceUpdates, "_stockPrices");
  releaseLock();
  response.type("application/json").send({
    key
  });
});
webapp.post("/undo", async function (request: Express.Request, response: Express.Response) {
  if (!await acquireLock()) {
    response.sendStatus(500);
    return;
  }
  await Promise.all([
    eggbase.delete(JSON.parse(request.body).key),
    eggbase.update({ "extraData.gaffeCounter": eggbase.util.increment() }, "_variables")
  ]);
  const gaffeCounter = (((await eggbase.get("_variables")) as ObjectType).extraData as ObjectType).gaffeCounter;
  releaseLock();
  response.type("application/json").send({
    gaffeCounter
  });
});
webapp.get("/stock-prices", async function (request: Express.Request, response: Express.Response) {
  response.type("application/json").send(((await eggbase.get("_stockPrices")) as ObjectType).extraData);
});
// Make webapp available to index.js in root directory
module.exports = {
  app: webapp
};
