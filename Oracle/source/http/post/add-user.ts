import { fromScriptError, toScriptKeys, Util } from "../../Util.js";
import { Request, Response } from "express";
// Command
type AddUser = {
  cmd: "add-user",
  game: string,
  user: string
};
export const cmd = "add-user";
export const method = "post";
export const path = "/cmd";
export async function exec(req: Request, res: Response) {
  try {
    const { client, aliveClients, ioredis, scripts } = req.app.locals as Util;
    const data = req.body as AddUser;
    const fields = ["users", "pledge", "can-trade", "pa", "cash", "init"];
    const users = [data.user];
    const userFields = ["last-member", "member", "own"];
    const keys = toScriptKeys(data.game, fields, users, userFields);
    await ioredis.evalsha(scripts["add-user"], keys.length, ...keys,
      1, data.game, data.user);
    // Re-roll init so that all users have some value, at least
    const fields2 = ["users", "init"];
    const keys2 = toScriptKeys(data.game, fields2);
    await ioredis.evalsha(scripts["roll-init"], keys2.length, ...keys2,
      0, data.game);
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        aliveClient.send(fromScriptError("reload"));
      }
    }
    res.status(200);
    res.type("application/json");
    res.send(fromScriptError("add-user"));
  } catch (err) {
    res.status(500);
    res.type("application/json");
    res.send(fromScriptError("add-user", err as Error));
  }
}