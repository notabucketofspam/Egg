import { fromScriptError, toScriptKeys, Util } from "../../Util.js";
import { Request, Response } from "express";
// Command
type RemoveUser = {
  cmd: "remove-user",
  game: string,
  user: string,
  passwd?: string
};
export const cmd = "remove-user";
export const method = "post";
export const path = "/cmd";
export async function exec(req: Request, res: Response) {
  try {
    const { client, aliveClients, ioredis, scripts } = req.app.locals as Util;
    const data = req.body as RemoveUser;
    // Check game password
    const gamePasswd = await ioredis.get(`game:${data.game}:passwd`);
    if (gamePasswd !== null) {
      const mainPasswd = await ioredis.get("main-passwd");
      if (data.passwd !== gamePasswd && data.passwd !== mainPasswd) {
        throw new Error("EPASSWD");
      }
    }
    const fields = ["users", "ready", "pledge", "can-trade", "pa", "cash", "init"];
    const users = [data.user];
    const userFields = ["last-member", "last-own", "member", "offers", "own"];
    const keys = toScriptKeys(data.game, fields, users, userFields);
    await ioredis.evalsha(scripts["remove-user"], keys.length, ...keys, 0, data.game, data.user);
    const disconnectMessage = JSON.stringify({ cmd: "disconnect", reason: "User removed from users set of game" });
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        if (clientMeta.user === data.user) {
          aliveClient.send(disconnectMessage);
          aliveClient.off("message", () => void 0);
          aliveClient.off("close", () => void 0);
          aliveClient.terminate();
          aliveClients.delete(aliveClient);
        } else {
          aliveClient.send(fromScriptError("reload"));
        }
      }
    }
    res.status(200);
    res.type("application/json");
    res.send(fromScriptError("remove-user"));
  } catch (err) {
    res.status(500);
    res.type("application/json");
    res.send(fromScriptError("remove-user", err as Error));
  }
}
