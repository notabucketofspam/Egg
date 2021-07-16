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
import EggUtil from "./EggUtil";
import StockPrice from "./StockPrice";
// Handle a form submission from the client
webapp.post("/submit", async function (request: Express.Request, response: Express.Response) {
  // FIX sanitize form submission
  
  //if (!await acquireLock()) {
  //  response.sendStatus(500);
  //  return;
  //}

  if (!await EggUtil.acquireLock()) {
    response.sendStatus(500);
  }

  //console.log((JSON.parse(request.body) as StockPrice.Submission).industry);
  //response.sendStatus(200);
  //return;

  const key = ((await eggbase.put(JSON.parse(request.body))) as ObjectType).key as string;
  EggUtil.releaseLock();
  response.type("application/json").send({ key });
  //return;

  // TODO do stock price calculations
  // const stockPriceDelta = StockPrice.delta(`put something here`);
  // const stockPriceUpdates = { };
  // Loop over stockPriceUpdates adding stuff like this:
  // stockPriceUpdates[stockName] = eggbase.util.increment(stockPriceDelta);
  // stockName must be a string
  // eggbase.update(stockPriceUpdates, "!stockPrices");

  //const fetchQuery = { industry: (JSON.parse(request.body) as EggUtil.Submission).industry };
  //const fetchResponseArray = [];
  //const allIndustryResults = new EggUtil.ExtendableArray();
  //do {
  //  allIndustryResults.drain(fetchResponseArray);
  //  const fetchOptions = allIndustryResults.length ? {
  //    last: allIndustryResults[allIndustryResults.length - 1].key as string
  //  } : undefined;
  //  const fetchResponse = await eggbase.fetch(fetchQuery, fetchOptions);
  //  for await (const item of fetchResponse as any)
  //    fetchResponseArray.push(item);
  //} while (fetchResponseArray.length);
  //const lastFourResults = allIndustryResults.sort(function (a, b) {
  //  return (b.timestamp) - (a.timestamp);
  //}).slice(0, 4) as EggUtil.Submission[];
  //console.log(lastFourResults);
  //StockPrice.delta(lastFourResults);
  //releaseLock();
  //response.type("application/json").send({ key });
});
// Do the thing
webapp.get("/test1", async function (request: Express.Request, response: Express.Response) {
  const fetchQuery = {};
  let fetchOptions = {};
  let fetchResponseArray = [];
  const allIndustryResults = new EggUtil.ExtendableArray();
  let fetchResponse = await eggbase.fetch(fetchQuery);
  for await (const item of fetchResponse as any)
    fetchResponseArray.push(item);
  allIndustryResults.drain(fetchResponseArray[0]);
  console.log("1", fetchResponseArray);
  //console.log("1.1", fetchResponseArray[0][fetchResponseArray.length - 1].key);
  console.log("1.2", allIndustryResults);
  //fetchOptions = { last: fetchResponseArray[0][fetchResponseArray.length - 1].key as string };
  fetchOptions = { last: allIndustryResults[allIndustryResults.length - 1].key as string };
  fetchResponseArray = [];
  fetchResponse = await eggbase.fetch(fetchQuery, fetchOptions);
  for await (const item of fetchResponse as any)
    fetchResponseArray.push(item);
  console.log("2", fetchResponseArray);
  response.sendStatus(200);
});
// Do the thing #2
webapp.get("/test2", async function (request: Express.Request, response: Express.Response) {
  //fs.appendFileSync("/tmp/lock.txt", "locked");
  //console.log(fs.existsSync("/tmp/lock.txt"));
  //try {
  //  fs.unlinkSync("/tmp/lock.txt");
  //} catch (error) {
  //  console.log(error);
  //}  
  //console.log(fs.existsSync("/tmp/lock.txt"));
  response.sendStatus(200);
});
// Do the thing #3
webapp.get("/test3", async function (request: Express.Request, response: Express.Response) {
  const fetchQuery = { industry: "Orange" };
  const allIndustryResults = new EggUtil.ExtendableArray();
  const fetchResponse = await (eggbase.fetch as any)(fetchQuery, Infinity, 4266);
  for await (const buffer of fetchResponse)
    allIndustryResults.extend(buffer);
  console.log(allIndustryResults);
  response.sendStatus(200);
});
// Do the thing #4, I guess
webapp.get("/test4", async function (request: Express.Request, response: Express.Response) {
  const allIndustryResults = new EggUtil.ExtendableArray();
  let counter = 0;
  const fetchQuery = { industry: "Orange" };
  let fetchResponse = await (eggbase.fetch as any)(fetchQuery, Infinity, 2);
  for await (const buffer of fetchResponse)
    console.log(++counter, buffer);
  response.sendStatus(200);
});
// Sample class for Deta API < 1.0.0
class ExtBase {
  tableName;
  constructor() {
    this.tableName = "";
  }
  request(path: string, payload: any, method: string) {
    let status: any;
    let response: any;
    return {
      status,
      response
    };
  }
  async *fetch(query = [], pages = 10, buffer = undefined) {
    /* Fetch items from the database.
     *
     * 'query' is a filter or a list of filters. Without filter, it'll return the whole db
     * Returns a generator with all the result.
     *  We will paginate the request based on `buffer`.
     */
    if (pages <= 0) return;
    const _query = Array.isArray(query) ? query : [query];

    let _status;
    let _last;
    let _items;
    let _count = 0;

    do {
      const payload: any = {
        query: _query,
        limit: buffer,
        last: _last,
      };

      const { status, response } = await this.request(
        `/${this.tableName}/query`,
        payload,
        'POST'
      );

      const { paging, items } = response;
      const { last } = paging;

      yield items;

      _last = last;
      _status = status;
      _items = items;
      _count += 1;
    } while (_status === 200 && _last && pages > _count);
  }

}
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
// Give the client the latest stick prices
webapp.get("/stock-prices", async function (request: Express.Request, response: Express.Response) {
  response.type("application/json").send(((await eggbase.get("!stockPrices")) as ObjectType).extraData);
});
// Make webapp available to index.js in root directory
module.exports = {
  app: webapp
};
