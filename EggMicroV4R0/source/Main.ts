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
  const putResponse = await eggbase.put(JSON.parse(request.body));
  // TODO when available, respond with the key of the newly-created DB entry
  // This will allow for the undo action to be performed correctly
  response.type("application/json").send({ key: (putResponse as ObjectType).key });
});
webapp.post("/undo", async function (request: Express.Request, response: Express.Response) {
  console.log(JSON.parse(request.body));
  // TODO find a way to store gaffeCounter somewhere
  response.type("application/json").send({ gaffeCounter: 0 });
});
// Make webapp available to index.js in root directory
module.exports = {
  app: webapp
};
