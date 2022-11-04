import { fromScriptError, Util } from "../Util.js";
// Command
type RemoveUser = {
  cmd: "remove-user",
  game: string,
  user: string
};
export const cmd = "remove-user";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: RemoveUser) {
  try {
    await ioredis.evalsha(scripts["remove-user"], 0, data.game, data.user);
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        if (clientMeta.user === data.user) {
          aliveClient.send(JSON.stringify({ cmd: "disconnect", reason: "User removed from users set of game" }));
          aliveClient.off("message", () => void 0);
          aliveClient.off("close", () => void 0);
          aliveClient.terminate();
          aliveClients.delete(aliveClient);
        } else {
          aliveClient.send(fromScriptError("remove-user"));
        }
      }
    }
  } catch (err) {
    client.send(fromScriptError("remove-user", err as Error));
  }
}
