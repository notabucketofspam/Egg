// Express setup
import * as Express from "express";
// Node sertup
import path from "node:path";
import crypto from "node:crypto";
// Oracle setup
import * as Oracle from "Oracle";
const OUtil: Oracle.OUtilType = await import(path.normalize(`file://${process.cwd()}/build/OUtil.js`));
// Other setup
/**
 * Create a submission key with 56-bit timestamp and 96-bit random suffix.
 */
function generateSubkey() {
  const timestamp = Date.now().toString(16).padStart(14, "0");
  const key0 = crypto.randomInt(Math.pow(2, 48) - 1).toString(16).padStart(12, "0");
  const key1 = crypto.randomInt(Math.pow(2, 48) - 1).toString(16).padStart(12, "0");
  return `sub:${timestamp}${key0}${key1}`;
}
const submissionKeys = [ "end", "ind", "start", "terr", "time", "win" ];
// Command
export const name = "submit";
export async function exec(request: Express.Request, response: Express.Response) {
  const oregano: Oracle.Oregano = request.app.locals.oregano;
  const submission = JSON.parse(request.body) as Oracle.Submission;
  const errorMessages = OUtil.errorCheck(submission);
  if (errorMessages.length)
    return [400, { error: errorMessages.join("\n<br>\n") }];
  const subkey = generateSubkey();
  await oregano.ioredis.evalsha(oregano.scripts["StockPrice"], 1, subkey, "submit",
    ...(Object.entries(submission).filter(([key, value]) => submissionKeys.includes(key))
      .map(([key, value]) => `${key} ${value}`)));
  return [200, { subkey }];
}
