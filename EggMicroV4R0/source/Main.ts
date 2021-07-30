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
import cors = require("cors");
webapp.use(cors());
// Deal with static HTML page requests
import path = require("path");
webapp.use(express.static(path.normalize(`${__dirname}/../www`), { index: "Index.html" }));
// Handle a form submission from the client
webapp.post("/form-submit", async function (request: Express.Request, response: Express.Response) {
  if (!await EggUtil.acquireLock()) {
    response.status(500).send("Unable to acquire lock.");
    return;
  }
  const submission = JSON.parse(request.body) as EggUtil.Submission;
  const errorMessages = EggUtil.errorCheck(submission);
  if (errorMessages.length) {
    response.status(400).send(errorMessages.join("\n<br />\n"));
    return;
  }
  // Slap that submission right in the machine
  const key = (await eggbase.put(submission as any) as Record<string, string>).key;
  // Temporary lockdown until locking mechanism gets fixed
  EggUtil.releaseLock();
  response.type("application/json").send({ key });
  return;
  await Promise.allSettled(await StockPrice.calculate(eggbase, submission.industry));
  EggUtil.releaseLock();
  submission.key = key;
  response.type("application/json").send({ submission });
});
// Test section
webapp.get("/test1", async function (request: Express.Request, response: Express.Response) {
  const now = Date.now();
  const [results, deletables] = await StockPrice.fetchLastIndustryResults(eggbase, "Blue");
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
  const [results, deletables] = await StockPrice.fetchLastIndustryResults(eggbase, "Brown");
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
webapp.get("/test5", async function (request: Express.Request, response: Express.Response) {
  // FIX acquireLock / releaseLock do not work in the slightest
  try {
    if (!await EggUtil.acquireLock()) {
      response.status(500).send("Thing bad");
      return;
    }
    console.log("lock", fs.existsSync("/tmp/lock.txt"));
    //setTimeout(function () {
    //  EggUtil.releaseLock();
    //  console.log("lock released");
    //}, 3500);
    await EggUtil.sleep(5000);
    EggUtil.releaseLock();
    response.sendStatus(200);
    //if (!await EggUtil.promiseWithTimeout(7500, "Unable to acquire lock", EggUtil.lockPromise)) {
    //  response.status(500).send("Unable to acquire lock (again).");
    //} else {
    //  response.sendStatus(200);
    //}
    //response.sendStatus(200);
  } catch (error) {
    console.log(error);
    response.sendStatus(500);
  }
});
import https = require("https");
webapp.get("/test6", async function (request: Express.Request, response: Express.Response) {
  https.get("https://v86nf8.deta.dev/test5", function (res) {
    //console.log("lock", fs.existsSync("/tmp/lock.txt"));
    //response.sendStatus(200);
  });
  setTimeout(function () {
    console.log("lock (again):", fs.existsSync("/tmp/lock.txt"));
    response.sendStatus(200);
  }, 2000);
});
// Handle client-side submission mistake
webapp.post("/form-undo", async function (request: Express.Request, response: Express.Response) {
  if (!await EggUtil.acquireLock()) {
    response.status(500).send("Unable to acquire lock.");
    return;
  }
  const submission = JSON.parse(request.body) as EggUtil.Submission;
  const errorMessages = EggUtil.errorCheck(submission);
  if (errorMessages.length) {
    response.status(400).send(errorMessages.join("\n<br />\n"));
    return;
  }
  // Temporary lockdown until locking mechanism gets fixed
  EggUtil.releaseLock();
  response.type("application/json").send({ gaffeCounter: -1 });
  return;
  await eggbase.delete(submission.key);
  await Promise.allSettled([
    await StockPrice.calculate(eggbase, submission.industry),
    eggbase.update({ "extraData.gaffeCounter": eggbase.util.increment() }, "!variables")
  ]);
  const gaffeCounter = (await eggbase.get("!variables") as any).extraData.gaffeCounter;
  EggUtil.releaseLock();
  response.type("application/json").send({ gaffeCounter });
});
// Give the client the latest stock prices
webapp.get("/stock-price", async function (request: Express.Request, response: Express.Response) {
  response.type("application/json").send((await eggbase.get("!stockPrice") as any).extraData);
});
// Make webapp available to index.js in root directory
module.exports = {
  app: webapp
};
