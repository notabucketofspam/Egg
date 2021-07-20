// Egg setup
import EggUtil from "./EggUtil";
import StockPrice from "./StockPrice";
// Deta setup
import Base from "deta/dist/types/base";
const { Deta } = require("deta");
const eggbase: Base = Deta().Base("EggBase");
// Express setup
import * as Express from "express";
import express = require("express");
const webapp: Express.Application = express();
webapp.enable("case sensitive routing");
// Deal with static HTML page requests
import path = require("path");
webapp.use(express.static(path.normalize(`${__dirname}/../www`), { index: "index.html" }));
// Handle a form submission from the client
webapp.post("/submit", async function (request: Express.Request, response: Express.Response) {
  if (!await EggUtil.acquireLock()) {
    response.sendStatus(500);
    return;
  }
  const submission = JSON.parse(request.body);
  const errorMessages = EggUtil.errorCheck(submission);
  if (errorMessages.length) {
    response.status(400).send(errorMessages.join("\n<br />\n"));
    return;
  }
  // Slap that submission right in the machine
  const key = (await eggbase.put(submission) as Record<string, string>).key;
  // Temporary lockdown until enough submissions come in
  EggUtil.releaseLock();
  response.type("application/json").send({ key });
  return;
  // Grab the last few results
  const [results, deletables] = await EggUtil.fetchLastIndustryResults(eggbase, submission.industry);
  // Calculate price changes
  const delta = StockPrice.delta(results);
  // Update stock prices in the DB
  const stockPrices = ((await eggbase.get("!stockPrices")) as any).extraData as Record<string, number>;
  const stockPriceUpdates: Record<string, any> = {};
  Object.entries(delta).forEach(function ([territory, value]) {
    stockPriceUpdates[`extraData.${territory}`] =
      eggbase.util.increment(stockPrices[territory] + value < 5 ? 0 : value);
  });
  const promiseArray: Promise<null>[] = [];
  promiseArray.push(eggbase.update(stockPriceUpdates, "!stockPrices"));
  // Delete old entries in the DB
  deletables.forEach(function (submission) {
    promiseArray.push(eggbase.delete(submission.key));
  });
  await Promise.allSettled(promiseArray);
  EggUtil.releaseLock();
  response.type("application/json").send({ key });
});
// Test section
webapp.get("/test1", async function (request: Express.Request, response: Express.Response) {
  const now = Date.now();
  const [results, deletables] = await EggUtil.fetchLastIndustryResults(eggbase, "Brown");
  //console.log("results", results);
  //console.log("deletables", deletables);
  const delta = StockPrice.delta(results);
  console.log("delta", delta);
  //const stockPriceUpdates: Record<string, any> = {};
  //Object.entries(delta).forEach(function ([key, value]) {
  //  stockPriceUpdates[`extraData.${key}`] = eggbase.util.increment(value);
  //});
  //console.log("stockPriceUpdates", stockPriceUpdates);
  response.status(200).send({ time: `${Date.now() - now}ms` } );
});
import * as fs from "fs";
webapp.get("/test2", async function (request: Express.Request, response: Express.Response) {
  console.log(fs.readFileSync(path.normalize(`${__dirname}/../www/index.html`), { encoding: "utf8" }));
  response.sendStatus(200);
});
webapp.get("/test3", async function (request: Express.Request, response: Express.Response) {
  const [results, deletables] = await EggUtil.fetchLastIndustryResults(eggbase, "Brown");
  console.log("results.last()", results.last());
  console.log("deletables.last()", deletables.last());
  response.sendStatus(200);
});
webapp.post("/test4", async function (request: Express.Request, response: Express.Response) {
  const submission = JSON.parse(request.body);
  const errorMessages = EggUtil.errorCheck(submission);
  console.log(errorMessages.join("\n"));
  response.sendStatus(200);
});
// Handle client-side submission mistake
webapp.post("/undo", async function (request: Express.Request, response: Express.Response) {
  if (!await EggUtil.acquireLock()) {
    response.sendStatus(500);
    return;
  }
  await Promise.allSettled([
    eggbase.delete(JSON.parse(request.body).key),
    eggbase.update({ "extraData.gaffeCounter": eggbase.util.increment() }, "!variables")
  ]);
  const gaffeCounter = (await eggbase.get("!variables") as any).extraData.gaffeCounter;
  EggUtil.releaseLock();
  response.type("application/json").send({ gaffeCounter });
});
// Give the client the latest stock prices
webapp.get("/stock-prices", async function (request: Express.Request, response: Express.Response) {
  response.type("application/json").send((await eggbase.get("!stockPrices") as any).extraData);
});
// Make webapp available to index.js in root directory
module.exports = {
  app: webapp
};
