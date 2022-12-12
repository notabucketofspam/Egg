// Redis / KeyDB setup (...again)
import IORedis from "ioredis";
const ioredis = new IORedis({ lazyConnect: true });
try {
  await ioredis.connect();
} catch (err) {
  console.log("Failed to connect");
  process.exit(1);
}
await Promise.all<void>([
  new Promise<void>(resolve => ioredis.set("global-ver", 4, () => resolve())),
  new Promise<void>(resolve => ioredis.script("FLUSH", () => resolve()))
]);
// Script setup
import path from "node:path";
import fs from "node:fs";
import { fromScriptError, readdirRecursive } from "./Util.js";
const scripts: Record<string, string> = {};
do {
  const luaDir = fs.opendirSync(path.normalize(`${process.cwd()}/lua`), { encoding: "utf8" });
  const scriptPaths: string[] = [];
  await readdirRecursive(luaDir, scriptPaths);
  await Promise.all(scriptPaths.map(async function (scriptFile) {
    scripts[path.basename(scriptFile, ".lua")] = await ioredis.script("LOAD",
      fs.readFileSync(scriptFile, { encoding: "utf8" })) as string;
  }));
} while (0);
// Command register setup (...again)
const commandRegister: Record<string, any> = {};
do {
  const commandsDir = fs.opendirSync(path.normalize(`${process.cwd()}/build/cmd`), { encoding: "utf8" });
  const commandPaths: string[] = [];
  await readdirRecursive(commandsDir, commandPaths);
  await Promise.all(commandPaths.map(async function (commandPath) {
    const command = await import(path.normalize(`file://${commandPath}`));
    commandRegister[command.cmd] = command.exec;
  }));
} while (0);
const commandRegisterObjectKeys = Object.keys(commandRegister);
// WebSocket setup
import http from "node:http";
import WebSocket from "ws";
import ExtWSS from "./ExtWSS.js";
const server = http.createServer();
const wss = new ExtWSS({ server });
server.listen(39000, "localhost");
// Listen for messages (pongs have already been filtered out)
wss.on("message", function (client: WebSocket, data: WebSocket.RawData, isBinary: boolean) {
  const dataObject = JSON.parse(data.toString());
  if (dataObject.cmd && commandRegisterObjectKeys.includes(dataObject.cmd)) {
    commandRegister[dataObject.cmd]({
      client,
      aliveClients: wss.aliveClients,
      ioredis,
      scripts
    }, dataObject);
  } else {
    const cmd = typeof dataObject.cmd === "string" ? dataObject.cmd as string : "no-cmd";
    client.send(fromScriptError(cmd, new Error("ENOCMD"), { "valid-cmds": commandRegisterObjectKeys }));
  }
});
export async function terminate() {
  let code = 0;
  wss.off("message", () => void 0);
  wss.terminate();
  await Promise.all<void>([
    new Promise<void>(resolve => void server.close(() => resolve())),
    new Promise<void>(resolve => void ioredis.quit(() => resolve()))
  ]).catch<void>(() => void (code = 1));
  return code;
}
