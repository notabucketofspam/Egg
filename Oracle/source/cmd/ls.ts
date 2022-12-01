import { Util } from "../Util.js";
// Command
type Ls = {
  cmd: "ls"
};
export const cmd = "ls";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Ls) {
  // Need to smembers "games", then push them to keys
  const keys: string[] = [];
  const gamesSet = await ioredis.smembers("games");
  for (const game of gamesSet) {
    keys.push(`game:${game}:users`);
  }
  const partialJson = await ioredis.evalsha(scripts["ls"], keys.length, ...keys, ...gamesSet);
  client.send(partialJson);
}
