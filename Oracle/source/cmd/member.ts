import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Member = {
  cmd: "member",
  game: string,
  user: string,
  con: string
};
export const cmd = "member";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Member) {
  try {
    const fields = ["users", "cash", "pw"];
    const users = [data.user];
    const userFields = ["member", "own"];
    const keys = toScriptKeys(data.game, fields, users, userFields);
    const partialJson = await ioredis.evalsha(scripts["member"], keys.length, ...keys,
      1, data.game, data.user, data.con) as string;
    for (const [aliveClient, clientMeta] of aliveClients)
      if (clientMeta.game === data.game)
        aliveClient.send(partialJson);
  } catch (err) {
    client.send(fromScriptError("member", err as Error));
  }
}
