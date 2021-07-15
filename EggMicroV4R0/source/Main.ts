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
// Taken directly from:
// https://spin.atomicobject.com/2020/01/16/timeout-promises-nodejs/
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
async function acquireLock(request: Express.Request, response: Express.Response) {
  const lockPromise = function () {
    return new Promise(async function (resolve, reject) {
      while ((((await eggbase.get("_variables")) as ObjectType).extraData as ObjectType).lock as boolean);
      resolve(0);
    });
  };
  let lockSuccess = true;
  await promiseWithTimeout(9250, lockPromise, "Unable to acquire lock")
  .catch(function (reason) {
    lockSuccess = false;
    response.status(500).send({
      reason
    });
  });
  await eggbase.update({ "extraData.lock": true }, "_variables");
  return lockSuccess;
}
async function unlock(request: Express.Request, response: Express.Response) {
  await eggbase.update({ "extraData.lock": false }, "_variables");
}
import SPC from "./StockPriceCalculator";
webapp.post("/submit", async function (request: Express.Request, response: Express.Response) {
  // FIX sanitize form submission
  if (!await acquireLock(request, response))
    return;
  const key = ((await eggbase.put(JSON.parse(request.body))) as ObjectType).key as string;
  // TODO do stock price calculations
  // FIX Use _variables.extraData.lock for all in-place DB modifications (e.g. get -> put)
  // `fetch the relevant industry results somehow...`
  // const stockPriceDelta = SPD.delta(`put something here`);
  // let stockPriceUpdates = { };
  // Loop over stockPriceUpdates adding stuff like this:
  // stockPriceUpdates[stockName] = eggbase.util.increment(stockPriceDelta);
  // stockName must be a string
  // eggbase.update(stockPriceUpdates, "_stockPrices");
  response.type("application/json").send({
    key
  });
  await unlock(request, response);
});
webapp.post("/undo", async function (request: Express.Request, response: Express.Response) {
  if (!await acquireLock(request, response))
    return;
  await Promise.all([
    eggbase.delete(JSON.parse(request.body).key),
    eggbase.update({ "extraData.gaffeCounter": eggbase.util.increment() }, "_variables")
  ]);
  response.type("application/json").send({
    gaffeCounter: (((await eggbase.get("_variables")) as ObjectType).extraData as ObjectType).gaffeCounter
  });
  await unlock(request, response);
});
webapp.get("/stock-prices", async function (request: Express.Request, response: Express.Response) {
  response.type("application/json").send(((await eggbase.get("_stockPrices")) as ObjectType).extraData);
});
// Make webapp available to index.js in root directory
module.exports = {
  app: webapp
};
