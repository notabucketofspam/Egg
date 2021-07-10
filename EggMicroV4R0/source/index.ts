const express = require('express');
const app = express();
app.get("/", function (request: any, response: any) {
  response.send("sauce");
});
module.exports = app;
