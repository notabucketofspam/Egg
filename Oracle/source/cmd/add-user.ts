import { fromScriptError, Util } from "../Util.js";
// Command
type AddUser = {
  cmd: "add-user",
  game: string,
  user: string
};
export const cmd = "add-user";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: AddUser) {
  try {
    await ioredis.evalsha(scripts["add-user"], 0, data.game, data.user);
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        aliveClient.send(fromScriptError("add-user"));
      }
    }
  } catch (err) {
    client.send(fromScriptError("add-user", err as Error));
  }
}