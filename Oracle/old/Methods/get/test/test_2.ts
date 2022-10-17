// Express setup
import * as Express from "express";
// Node sertup
import crypto from "node:crypto";
// Handler
export const method = "get";
export const route = "/test_2";
export async function exec(request: Express.Request, response: Express.Response) {
  const timestamp = Date.now().toString(16).padStart(14, "0");
  const key = crypto.randomInt(Math.pow(2, 48) - 1).toString(16).padStart(12, "0");
  response.send(timestamp + key);
}
