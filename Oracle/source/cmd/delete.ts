import { Util } from "../Util.js";
// Command
type Delete = {
  cmd: "delete",
  game: string
};
export const cmd = "delete";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Delete) {
  try {
    await ioredis.evalsha(scripts["delete"], 0, data.game);
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        aliveClient.off("message", () => void 0);
        aliveClient.off("close", () => void 0);
        aliveClient.terminate();
        aliveClients.delete(aliveClient);
      }
    }
    client.send(JSON.stringify({ cmd: "delete", ok: true }));
  } catch (err: unknown) {
    client.send(JSON.stringify({ cmd: "delete", err: "ENOGAME", why: "The game provided does not exist" }));
  }
}
