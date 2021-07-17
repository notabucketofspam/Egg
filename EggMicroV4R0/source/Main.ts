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
// Egg setup
import EggUtil from "./EggUtil";
import StockPrice from "./StockPrice";
// Handle a form submission from the client
webapp.post("/submit", async function (request: Express.Request, response: Express.Response) {
  // FIX sanitize form submission
  if (!await EggUtil.acquireLock()) {
    response.sendStatus(500);
    return;
  }
  // Slap that submission right in the machine
  const key = ((await eggbase.put(JSON.parse(request.body))) as ObjectType).key as string;
  // Grab the last few results
  const results = await EggUtil.fetchLastIndustryResults(eggbase, JSON.parse(request.body).industry);
  // Calculate price changes and update the DB
  const delta = StockPrice.delta(results);
  const updates: ObjectType = {};
  Object.entries(delta).forEach(function ([key, value]) {
    updates[`extraData.${key}`] = eggbase.util.increment(value as number);
  });
  //eggbase.update(updates, "!stockPrices");
  EggUtil.releaseLock();
  response.type("application/json").send({ key });
});

// Do the thing #1
webapp.get("/test1", async function (request: Express.Request, response: Express.Response) {
  const results = await EggUtil.fetchLastIndustryResults(eggbase, "Brown");
  console.log("results", results);
  const delta = StockPrice.delta(results);
  console.log("delta", delta);
  const updates: ObjectType = {};
  Object.entries(delta).forEach(function ([key, value]) {
    updates[`extraData.${key}`] = eggbase.util.increment(value as number);
  });
  console.log("updates", updates);
  response.sendStatus(200);
});
// Handle client-side submission mistake
webapp.post("/undo", async function (request: Express.Request, response: Express.Response) {
  if (!await EggUtil.acquireLock()) {
    response.sendStatus(500);
    return;
  }
  await Promise.all([
    eggbase.delete(JSON.parse(request.body).key),
    eggbase.update({ "extraData.gaffeCounter": eggbase.util.increment() }, "!variables")
  ]);
  const gaffeCounter = (((await eggbase.get("!variables")) as ObjectType).extraData as ObjectType).gaffeCounter;
  EggUtil.releaseLock();
  response.type("application/json").send({ gaffeCounter });
});
// Give the client the latest stock prices
webapp.get("/stock-prices", async function (request: Express.Request, response: Express.Response) {
  response.type("application/json").send(((await eggbase.get("!stockPrices")) as ObjectType).extraData);
});
// Make webapp available to index.js in root directory
module.exports = {
  app: webapp
};
