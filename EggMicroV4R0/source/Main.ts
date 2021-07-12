// Other backend setup
//import { DateTime } from "luxon";
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
// Start dealing with requests
webapp.use(express.static(path.join(`${__dirname}/../html`)));
webapp.post("/submit", async function (request: Express.Request, response: Express.Response) {
  // TODO sanitize form submission
  response.type("application/json").send({
    key: ((await eggbase.put(JSON.parse(request.body))) as ObjectType).key
  });
});
webapp.post("/undo", async function (request: Express.Request, response: Express.Response) {
  await Promise.all([
    eggbase.delete(JSON.parse(request.body).key),
    eggbase.update({ "extraData.gaffeCounter": eggbase.util.increment() }, "_gaffeCounter")
  ]);
  response.type("application/json").send({
    gaffeCounter: (((await eggbase.get("_gaffeCounter")) as ObjectType).extraData as ObjectType).gaffeCounter
  });
});
webapp.get("/stock-prices", async function (request, response) {
  // TODO do stock price calculations
  response.type("application/json").send({
    
  });
});
// Make webapp available to index.js in root directory
module.exports = {
  app: webapp
};
