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
    const fields = ["users", "ready", "round"];
    const keys = toScriptKeys(data.game, fields);
    const partialJson = await ioredis.evalsha(scripts["ready"], keys.length, ...keys,
      0, data.game, data.user, String(data.ready)) as string;
    const partialObj = JSON.parse(partialJson);
    // Only trigger on phase change, not just any toggle
    if (partialObj["round"]["phase"] === 0 && data.phase !== partialObj["round"]["phase"]) {
      // Do dividends update
      const fields: string[] = ["users", "cash", "pw"];
      const users = await ioredis.smembers(`game:${data.game}:users`);
      const userFields = ["last-member", "member", "own"];
      const keys = toScriptKeys(data.game, fields, users, userFields);
      const morePartialJson = await ioredis.evalsha(scripts["dividends"], keys.length, ...keys,
        users.length, data.game) as string;
      const morePartialObj = JSON.parse(morePartialJson);
      partialObj["cash"] = morePartialObj["cash"];
    } else if ((partialObj["round"]["phase"] === 2 || partialObj["round"]["phase"] === 3)
      && data.phase !== partialObj["round"]["phase"]) {
      // Roll for initiative / second initiative
      const fields = ["users", "init", "second-init"];
      const keys = toScriptKeys(data.game, fields);
      const morePartialJson = await ioredis.evalsha(scripts["roll-init"], keys.length, ...keys,
        0, data.game, partialObj["round"]["phase"] - 1) as string;
      const morePartialObj = JSON.parse(morePartialJson);
      if (morePartialObj["init"])
        partialObj["init"] = morePartialObj["init"];
      else
        partialObj["second-init"] = morePartialObj["second-init"];
    } else if (partialObj["round"]["phase"] === 5 && data.phase !== partialObj["round"]["phase"]) {
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
