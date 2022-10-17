// Express setup
import * as Express from "express";
// Node setup
import fs from "node:fs";
import path from "node:path";
// Oracle setup
import * as Oracle from "Oracle";
const OUtil: Oracle.OUtilType = await import(path.normalize(`file://${process.cwd()}/build/OUtil.js`));
// Command register setup
const commandRegister: Oracle.CommandRegister = {};
do {
  const commandsDir = fs.opendirSync(path.normalize(`${process.cwd()}/build/Commands/StockPrice`),
    { encoding: "utf8" });
  const commandFiles: string[] = [];
  await OUtil.readdirRecursive(commandsDir, commandFiles);
  await Promise.all(commandFiles.map(async function (commandFile) {
    const command: Oracle.HttpRequestCommand = await import(path.normalize(`file://${commandFile}`));
    commandRegister[command.name] = command.exec;
  }));
} while (0);
const commandRegisterObjectKeys = Object.keys(commandRegister);
// Handler
export const method = "post";
export const route = "/exec/stock-price";
export async function exec(request: Express.Request, response: Express.Response) {
  const commandName = request.get("Command-Name");
  // Assume something went wrong until otherwise noted
  let status = 400;
  let send: Record<string, any> = { error: `Invalid command: ${commandName ? commandName : "undefined"}.` };
  if (commandName && commandRegisterObjectKeys.includes(commandName))
    [status, send] = await commandRegister[commandName](request, response);
  response.status(status).send(send);
}
