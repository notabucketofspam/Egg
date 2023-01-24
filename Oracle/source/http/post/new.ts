import { fromScriptError, toScriptKeys, Util } from "../../Util.js";
import { Request, Response } from "express";
// Command
type New = {
  cmd: "new",
  user: string
};
export const cmd = "new";
export const method = "post";
export const path = "/cmd";
export async function exec(req: Request, res: Response) {
  try {
    const gameId = Date.now().toString(16).padStart(14, "0");
    const { client, aliveClients, ioredis, scripts } = req.app.locals as Util;
    const data = req.body as New;
    const fields = ["index", "price", "delta", "pw", "round", "ver", "next-price", "soup", "last-time"];
    const keys = toScriptKeys(gameId, fields);
    await ioredis.evalsha(scripts["new"], keys.length, ...keys, 0, gameId, `game:${gameId}:trade:`);
    try {
      const fields = ["users", "pledge", "can-trade", "pa", "cash", "init", "last-cash"];
      const users = [data.user];
      const userFields = ["last-member", "member", "own"];
      const keys = toScriptKeys(gameId, fields, users, userFields);
      await ioredis.evalsha(scripts["add-user"], keys.length, ...keys,
        1, gameId, data.user);
      res.status(200);
      res.type("application/json");
      res.send(JSON.stringify({ cmd: "new", newGame: gameId }));
    } catch (err) {
      res.status(500);
      res.type("application/json");
      res.send(fromScriptError("new", err as Error));
    }
  } catch (err) {
    res.status(500);
    res.type("application/json");
    res.send(fromScriptError("new", new Error("EUNKNOWN")));
  }
}
