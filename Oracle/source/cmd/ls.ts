import { Util, fromMapReply, RedisReply } from "../Util.js";
// Command
type Ls = {
  cmd: "ls"
};
export const cmd = "ls";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Ls) {
  const games = fromMapReply(await ioredis.evalsha(scripts["ls"], 0) as RedisReply[]);
  client.send(JSON.stringify({ cmd: "ls", games }));
}
