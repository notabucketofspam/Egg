import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Raise = {
  cmd: "raise",
  game: string,
  user: string,
  stock: string,
  flavor: number
};
export const cmd = "raise";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Raise) {
  const fields: string[] = ["users", "cash", "pw"];
  const keys = toScriptKeys(data.game, fields);
  try {
    const partialJson = await ioredis.evalsha(scripts["raise"], keys.length, ...keys,
      0, data.game, data.user, data.stock, data.flavor);
    for (const [aliveClient, clientMeta] of aliveClients)
      if (clientMeta.game === data.game)
        aliveClient.send(partialJson);
  } catch (err) {
    client.send(fromScriptError("raise", err as Error));
  }
}
