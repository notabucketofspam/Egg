// Express setup
import * as Express from "express";
// Handler
export const method = "get";
export const route = "/test_0";
export async function exec(request: Express.Request, response: Express.Response) {
  response.send(
    `npm test: execute test command on server
Synopsis: npm test [-- TEST_NO]
Options:
  TEST_NO    number of the test to run; default 0`
  );
}
