import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Debug = {
  cmd: "debug",
  game: string,
  field: string,
  user?: string,
  userField?: string,
  prop: string,
  value: string
};
export const cmd = "debug";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Debug) {
  try {
    const field = data.user && data.userField ? data.userField : data.field;
    const fields = data.user && data.userField ? ["users"] : ["users", data.field];
    const users = data.user && data.userField ? [data.user] : undefined;
    const userFields = data.user && data.userField ? [data.userField] : undefined;
    const keys = toScriptKeys(data.game, fields, users, userFields);
    const userCount = data.user && data.userField ? 1 : 0;
    const partialJson = await ioredis.evalsha(scripts["debug"], keys.length, ...keys,
      userCount, data.game, String(data.user), field, data.prop, data.value);
    for (const [aliveClient, clientMeta] of aliveClients)
      if (clientMeta.game === data.game)
        aliveClient.send(partialJson);
  } catch (err) {
    client.send(fromScriptError("debug", err as Error));
  }
}
