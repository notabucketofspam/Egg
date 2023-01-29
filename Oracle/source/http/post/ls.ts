import { Util } from "../../Util.js";
import { Request, Response } from "express";
// Command
type Ls = {
  cmd: "ls"
};
export const cmd = "ls";
export const method = "post";
export const path = "/cmd";
export async function exec(req: Request, res: Response) {
  const { client, aliveClients, ioredis, scripts } = req.app.locals as Util;
  const data = req.body as Ls;
  const games = await ioredis.smembers("games");
  const keys = games.map(game => `game:${game}:users`);
  const partialJson = await ioredis.evalsha(scripts["ls"], keys.length, ...keys, ...games) as string;
  const partial = JSON.parse(partialJson);
  const locks: Record<string, boolean> = {};
  await Promise.all(games.map(async game => {
    locks[game] = !!(await ioredis.exists(`game:${game}:passwd`));
  }));
  partial["locks"] = locks;
  res.status(200);
  res.type("application/json");
  res.send(JSON.stringify(partial));
}
