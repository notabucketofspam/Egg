// Express setup
import * as Express from "express";
// Node setup
import fs from "node:fs";
import path from "node:path";
// Oracle setup
import * as Oracle from "Oracle";
const OUtil: Oracle.OUtilType = await import(path.normalize(`file://${process.cwd()}/build/OUtil.js`));
// Handler
export const method = "get";
export const route = "/test/1";
export async function exec(request: Express.Request, response: Express.Response) {
  const files: string[] = [];
  const sourceDir = fs.opendirSync(path.normalize(`${process.cwd()}/source`), { encoding: "utf8" });
  await OUtil.readdirRecursive(sourceDir, files);
  response.send(files.join("\n"));
}
