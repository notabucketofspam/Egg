// WebSocket setup
import { WebSocket, WebSocketServer, ServerOptions } from "ws";
/**
 * Wrapper for WebSocketServer with browser-compatible ping-pong
 */
export default class ExtWSS extends WebSocketServer {
  private pingFrame = Uint8Array.from([0x9]);
  private pongFrame = Uint8Array.from([0xA]);
  private aliveClients: Map<WebSocket, boolean>;
  private pingTimer: NodeJS.Timer;
  constructor(options?: ServerOptions, callback?: () => void) {
    super(options, callback);
    this.aliveClients = new Map();
    this.pingTimer = setInterval(function (server) {
      for (const [client, isAlive] of server.aliveClients.entries()) {
        if (!isAlive) {
          client.terminate();
          server.aliveClients.delete(client);
          continue;
        }
        server.aliveClients.set(client, false);
        client.send(server.pingFrame);
      }
    }, 30000, this);
    const server = this;
    this.on("connection", function (client, request) {
      server.aliveClients.set(client, true);
      client.on("message", function (data, isBinary) {
        if (isBinary && (data as Buffer).length === 1 && (data as Buffer)[0] === server.pongFrame[0]) {
          //console.log("Pong!");
          server.aliveClients.set(this, true);
        } else {
          server.emit("message", data, isBinary);
        }
      });
      client.on("close", function () {
        server.aliveClients.delete(this);
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
