import { ClientMeta } from "./Util.js";
// WebSocket setup
import { WebSocket, WebSocketServer, ServerOptions } from "ws";
/**
 * Wrapper for WebSocketServer with browser-compatible ping-pong
 */
export default class ExtWSS extends WebSocketServer {
  private pingFrame = Uint8Array.from([0x9]);
  private pongFrame = Uint8Array.from([0xA]);
  aliveClients: Map<WebSocket, ClientMeta>;
  private pingTimer: NodeJS.Timer;
  constructor(options?: ServerOptions, callback?: () => void) {
    super(options, callback);
    this.aliveClients = new Map();
    this.pingTimer = setInterval(() => {
      for (const [client, clientMeta] of this.aliveClients.entries()) {
        if (!clientMeta.isAlive) {
          client.off("message", () => void 0);
          client.off("close", () => void 0);
          client.terminate();
          this.aliveClients.delete(client);
          continue;
        }
        this.aliveClients.get(client)!.isAlive = false;
        client.send(this.pingFrame);
      }
    }, 30000);
    this.on("connection", (client, request) => {
      this.aliveClients.set(client, { isAlive: true });
      client.on("message", (data, isBinary) => {
        if (isBinary && (data as Buffer).length === 1 && (data as Buffer)[0] === this.pongFrame[0]) {
          this.aliveClients.get(client)!.isAlive = true;
        } else {
          this.emit("message", client, data, isBinary);
        }
      });
      client.once("close", () => {
        client.off("message", () => void 0);
        this.aliveClients.delete(client);
      });
    });
  }
  terminate() {
    clearInterval(this.pingTimer);
    for (const client of this.clients) {
      client.off("message", () => void 0);
      client.off("close", () => void 0);
      client.terminate();
    }
    this.aliveClients.clear();
    this.off("connection", () => void 0);
    this.close();
  }
}
