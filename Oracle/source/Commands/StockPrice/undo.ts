// Express setup
import * as Express from "express";
// Oracle setup
import * as Oracle from "Oracle";
// Command
export const name = "undo";
export async function exec(request: Express.Request, response: Express.Response) {
  const oregano: Oracle.Oregano = request.app.locals.oregano;
  const subkey = request.body.subkey as string;
  if (!subkey)
    return [400, { error: "Undefined subkey." }];
  const gaffeCounter = await oregano.ioredis.evalsha(oregano.scripts["StockPrice"], 1, subkey, "undo") as number;
  if (gaffeCounter < 0)
    return [400, { error: "Invalid subkey." }];
  return [200, { gaffeCounter }];
}
