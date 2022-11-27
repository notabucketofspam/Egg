import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Delete = {
  cmd: "delete",
  game: string
};
export const cmd = "delete";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Delete) {
  try {
    const fields = ["index", "users", "pledge", "can-trade", "pa", "cash", "init", "second-init",
      "price", "delta", "pw", "round", "ready", "ver"];
    const users = await ioredis.smembers(`game:${data.game}:users`);
    const userFields = ["last-member", "last-own", "member", "offers", "own"];
    const keys = toScriptKeys(data.game, fields, users, userFields);
    await ioredis.evalsha(scripts["delete"], keys.length, ...keys, users.length, data.game);
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        aliveClient.send(JSON.stringify({ cmd: "disconnect", reason: "Game deleted from games set" }));
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
