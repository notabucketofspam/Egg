// Express setup
import * as Express from "express";
// Node setup
import path from "node:path";
// Oracle setup
import * as Oracle from "Oracle";
const OUtil: Oracle.OUtilType = await import(path.normalize(`file://${process.cwd()}/build/OUtil.js`));
// Command
export const name = "undo";
export async function exec(request: Express.Request, response: Express.Response) {
  const oregano: Oracle.Oregano = request.app.locals.oregano;
  const subkey = request.body.subkey as string;
  if (!subkey)
    return [400, { error: "Undefined subkey." }];
  const send = OUtil.fromMapReply(await oregano.ioredis.evalsha(oregano.scripts["StockPrice"],
    1, subkey, "undo") as string[]);
  const gaffeCounter = Number.parseInt(send["gaffe-counter"]);
  if (gaffeCounter < 0)
    return [400, { error: "Invalid subkey." }];
  if (send["err"])
    return [500, { error: send["err"] }];
  return [200, { gaffeCounter }];
}
