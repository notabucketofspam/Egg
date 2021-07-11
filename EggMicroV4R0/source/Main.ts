// Other backend setup
import path = require("path");
//import { DateTime } from "luxon";
// Deta setup
import Base from "deta/dist/types/base";
const { Deta } = require("deta");
const eggbase: Base = Deta().Base("EggBase");
// Express setup
import { Application, Request, Response } from "express";
const express = require('express');
const webapp: Application = express();
webapp.enable("case sensitive routing");
webapp.use(express.static(path.join(`${__dirname}/../html`)));
// Make webapp available to index.js in root directory
module.exports = {
  app: webapp
};
