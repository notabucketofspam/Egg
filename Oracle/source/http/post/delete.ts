import { fromScriptError, toScriptKeys, Util } from "../../Util.js";
import { Request, Response } from "express";
// Command
type Delete = {
  cmd: "delete",
  game: string
};
export const cmd = "delete";
export const method = "post";
export const path = "/";
export async function exec(req: Request, res: Response) {
  try {
    const { client, aliveClients, ioredis, scripts } = req.app.locals as Util;
    const data = req.body as Delete;
    const fields = ["index", "users", "pledge", "can-trade", "pa", "cash", "init", "second-init",
      "price", "delta", "pw", "round", "ready", "ver", "next-price"];
    const users = await ioredis.smembers(`game:${data.game}:users`);
    const userFields = ["last-member", "cart-json", "member", "offers-json", "own"];
    const keys = toScriptKeys(data.game, fields, users, userFields);
    await ioredis.evalsha(scripts["delete"], keys.length, ...keys, users.length, data.game);
    const disconnectMessage = JSON.stringify({ cmd: "disconnect", reason: "Game deleted from games set" });
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        aliveClient.send(disconnectMessage);
        aliveClient.off("message", () => void 0);
        aliveClient.off("close", () => void 0);
        aliveClient.terminate();
        aliveClients.delete(aliveClient);
      }
    }
    res.status(200);
    res.type("application/json");
    res.send(fromScriptError("delete"));
  } catch (err) {
    res.status(500);
    res.type("application/json");
    res.send(fromScriptError("delete", err as Error));
  }
}
