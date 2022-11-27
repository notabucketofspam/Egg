import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Ready = {
  cmd: "ready",
  game: string,
  user: string,
  ready: boolean,
  phase: number
};
export const cmd = "ready";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Ready) {
  try {
    // Do round update
    const partialJson = await ioredis.evalsha(scripts["ready"], 0, data.game, data.user, String(data.ready)) as any;
    const partialObj = JSON.parse(partialJson);
    partialObj["cmd"] = "update";
    // Only trigger on phase change, not just any toggle
    if (partialObj["round"] === 0 && data.phase !== partialObj["round"]["phase"]) {
      // Do dividends update
      const fields: string[] = ["users", "cash", "pw"];
      const users = await ioredis.smembers(`game:${data.game}:users`);
      const userFields = ["member", "own"];
      const keys = toScriptKeys(data.game, fields, users, userFields);
      const morePartialJson = await ioredis.evalsha(scripts["dividends"], keys.length, ...keys,
        users.length, data.game) as string;
      const morePartialObj = JSON.parse(morePartialJson);
      partialObj["cash"] = morePartialObj["cash"];
    } else if (partialObj["round"] === 5 && data.phase !== partialObj["round"]["phase"]) {
      // Do good will update
      const fields: string[] = ["users", "cash", "pledge", "pa"];
      const users = await ioredis.smembers(`game:${data.game}:users`);
      const userFields = ["last-member", "member"];
      const keys = toScriptKeys(data.game, fields, users, userFields);
      const morePartialJson = await ioredis.evalsha(scripts["good-will"], keys.length, ...keys,
        users.length, data.game) as string;
      const morePartialObj = JSON.parse(morePartialJson);
      partialObj["cash"] = morePartialObj["cash"];
    }
  for (const [aliveClient, clientMeta] of aliveClients)
    if (clientMeta.game === data.game)
      aliveClient.send(JSON.stringify(partialObj));
  } catch (err) {
    client.send(fromScriptError("update", err as Error));
  }
}
