import { Util } from "../../Util.js";
import { Request, Response } from "express";
// Command
type Ls = {
  cmd: "ls"
};
export const cmd = "ls";
export const method = "post";
export const path = "/";
export async function exec(req: Request, res: Response) {
  const { client, aliveClients, ioredis, scripts } = req.app.locals as Util;
  const data = req.body as Ls;
  // Need to smembers "games", then push them to keys
  const keys: string[] = [];
  const gamesSet = await ioredis.smembers("games");
  for (const game of gamesSet) {
    keys.push(`game:${game}:users`);
  }
  const partialJson = await ioredis.evalsha(scripts["ls"], keys.length, ...keys, ...gamesSet) as string;
  res.status(200);
  res.type("application/json");
  res.send(partialJson);
}
