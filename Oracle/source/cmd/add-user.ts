import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type AddUser = {
  cmd: "add-user",
  game: string,
  user: string
};
export const cmd = "add-user";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: AddUser) {
  try {
    const fields = ["users", "pledge", "can-trade", "pa", "cash", "init", "second-init"];
    const users = [data.user];
    const userFields = ["last-member", "last-own", "member", "own"];
    const keys = toScriptKeys(data.game, fields, users, userFields);
    await ioredis.evalsha(scripts["add-user"], keys.length, ...keys,
      1, data.game, data.user);
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        aliveClient.send(fromScriptError("reload"));
      }
    }
  } catch (err) {
    client.send(fromScriptError("add-user", err as Error));
  }
}