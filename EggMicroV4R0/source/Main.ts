import { ObjectType } from "deta/dist/types/types/basic";
// Deta setup
import Base from "deta/dist/types/base";
const { Deta } = require("deta");
const eggbase: Base = Deta().Base("EggBase");
// Express setup
import * as Express from "express";
import express = require("express");
const webapp: Express.Application = express();
webapp.enable("case sensitive routing");
webapp.use(express.urlencoded());
import path = require("path");
// Deal with static HTML page requests
webapp.use(express.static(path.join(`${__dirname}/../html`)));
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
import * as fs from "fs";
/**
 * Try to lock eggbase from other requests accessing it
 * Probably doesn't work as intended, who knows
 * @returns {Promise<boolean>} Promise that says whether or not the lock was acquired
 */
async function acquireLock() {
  const lockPromise = function () {
    return new Promise(function (resolve, reject) {
      while (fs.existsSync("/tmp/lock.txt"));
      fs.appendFileSync("/tmp/lock.txt", "locked");
      resolve(0);
    });
  };
  let lockSuccess = true;
  // Not 10000ms below because otherwise the micro might time out
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
import StockPrice from "./StockPrice";
// Handle a form submission from the client
webapp.post("/submit", async function (request: Express.Request, response: Express.Response) {
  // FIX sanitize form submission
  if (!await acquireLock()) {
    response.sendStatus(500);
    return;
  }
  const key = ((await eggbase.put(JSON.parse(request.body))) as ObjectType).key as string;
  // TODO do stock price calculations
  // const stockPriceDelta = StockPrice.delta(`put something here`);
  // const stockPriceUpdates = { };
  // Loop over stockPriceUpdates adding stuff like this:
  // stockPriceUpdates[stockName] = eggbase.util.increment(stockPriceDelta);
  // stockName must be a string
  // eggbase.update(stockPriceUpdates, "_stockPrices");
  const industryFetchQuery = { industry: (JSON.parse(request.body) as StockPrice.Submission).industry };
  let industryFetchResponse = await eggbase.fetch(industryFetchQuery);
  const industryAllFetchResults = (new StockPrice.ExtendableArray()).extend(industryFetchResponse.items);
  while (industryFetchResponse.last) {
    industryFetchResponse = await eggbase.fetch(industryFetchQuery, { last: industryFetchResponse.last });
    industryAllFetchResults.extend(industryFetchResponse.items);
  }
  const industryLastFourResults = industryAllFetchResults.sort(function (a, b) {
    return (b.timestamp) - (a.timestamp);
  }).slice(0, 4) as StockPrice.Submission[];
  console.log(industryLastFourResults);
  StockPrice.delta(industryLastFourResults);
  releaseLock();
  response.type("application/json").send({ key });
});
// Handle client-side submission mistake
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
  response.type("application/json").send({ gaffeCounter });
});
// Give the client the latest stick prices
webapp.get("/stock-prices", async function (request: Express.Request, response: Express.Response) {
  response.type("application/json").send(((await eggbase.get("_stockPrices")) as ObjectType).extraData);
});
// Make webapp available to index.js in root directory
module.exports = {
  app: webapp
};
