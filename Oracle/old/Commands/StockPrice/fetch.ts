// Express setup
import * as Express from "express";
// Oracle setup
import * as Oracle from "Oracle";
// Command
export const name = "fetch";
export async function exec(request: Express.Request, response: Express.Response) {
  const oregano: Oracle.Oregano = request.app.locals.oregano;
  const stockPrice = await oregano.ioredis.hgetall("stock-price");
  const delta = await oregano.ioredis.hgetall("delta");
  return [200, {stockPrice, delta}];
}
