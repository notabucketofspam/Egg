import { fromScriptError, Util } from "../Util.js";
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
    client.send(fromScriptError("delete"));
  } catch (err) {
    client.send(fromScriptError("delete", err as Error));
  }
}
