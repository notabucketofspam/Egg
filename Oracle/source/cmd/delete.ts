import { RedisReply, Util } from "../Util.js";
// Command
type Delete = {
  cmd: "delete",
  game: string
};
export const cmd = "delete";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Delete) {
  const status = await ioredis.evalsha(scripts["delete"], 0, data.game) as RedisReply;
  if (status === "OK") {
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        aliveClient.off("message", () => void 0);
        aliveClient.off("close", () => void 0);
        aliveClient.terminate();
        aliveClients.delete(aliveClient);
      }
    }
  } else {
    client.send(JSON.stringify({ cmd: "delete", err: "ENOGAME", why: "The game provided does not exist" }));
  }
}
