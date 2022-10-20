// Node setup
import http from "node:http";
import WebSocket from "ws";
// WebSocket setup
import ExtWSS from "./ExtWSS.js";
const server = http.createServer();
const wss = new ExtWSS({ server });
server.listen(39000, "localhost");
wss.on("message", function (client: WebSocket, data: WebSocket.RawData, isBinary: boolean) {
  console.log(JSON.parse(data.toString()), isBinary);
  client.send("Beep beep");
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
