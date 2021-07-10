// Import dependencies
const express = require("express");
const { Deta } = require("deta");
// Insert project key from .env file
const dotenv = require("dotenv");
dotenv.config();
const deta = Deta(process.env.DETA_PROJECT_KEY);
const eggdata = deta.Base("EggData");
