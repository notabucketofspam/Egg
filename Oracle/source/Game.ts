// Node setup
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
// WebSocket setup
import WebSocket from "ws";
import ExtWSS from "./ExtWSS.js";
const server = http.createServer();
const wss = new ExtWSS({ server });
server.listen(39000, "localhost");
const activeGames = new Map<string, Map<WebSocket, string>>();
// Command register setup (...again)
import { readdirRecursive } from "./Util.js";
const commandRegister: Record<string, any> = { };
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
// Listen for messages (pongs have already been filtered out)
wss.on("message", function (client: WebSocket, data: WebSocket.RawData, isBinary: boolean) {
  const dataObject = JSON.parse(data.toString());
  if (dataObject.cmd && commandRegisterObjectKeys.includes(dataObject.cmd)) {
    commandRegister[dataObject.cmd]({
      client,
      activeGames
    }, dataObject);
  }
});
export async function terminate() {
  let code = 0;
  wss.off("message", () => void 0);
  wss.terminate();
  await Promise.all<void>([
    new Promise<void>(resolve => void server.close(() => resolve()))
  ]).catch<void>(() => void (code = 1));
  return code;
}
