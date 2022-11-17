import { Util } from "../Util.js";
// Command
type Ready = {
  cmd: "ready",
  game: string,
  user: string,
  ready: boolean
};
export const cmd = "ready";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Ready) {
  if (data.ready)
    await ioredis.sadd(`game:${data.game}:ready`, data.user);
  else
    await ioredis.srem(`game:${data.game}:ready`, data.user);
  const ready = ioredis.smembers(`game:${data.game}:ready`);
  for (const [aliveClient, clientMeta] of aliveClients)
    if (clientMeta.game === data.game)
      aliveClient.send(JSON.stringify({ cmd: "update", ready }));
}
