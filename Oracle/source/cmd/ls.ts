import { Util } from "../Util.js";
// Command
type Ls = {
  cmd: "ls"
};
export const cmd = "ls";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Ls) {
  const keys: string[] = [];
  const gamesSet = await ioredis.smembers("games");
  for (const game in gamesSet) {
    keys.push(`game:${game}:users`);
  }
  // Need to smembers "games", then .push them to keys
  //const games = fromMapReply(await ioredis.evalsha(scripts["ls"], 0) as RedisReply[]);
  const partialJson = await ioredis.evalsha(scripts["ls"], keys.length, ...keys, ...gamesSet);
  client.send(partialJson);
}
