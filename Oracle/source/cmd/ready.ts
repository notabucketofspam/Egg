import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Ready = {
  cmd: "ready",
  game: string,
  user: string,
  ready: boolean,
  users: string[],
  phase: number
};
export const cmd = "ready";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Ready) {
  try {
    // Do round update
    const frameJson = await ioredis.evalsha(scripts["ready"], 0, data.game, data.user, String(data.ready)) as any;
    const frameObject = JSON.parse(frameJson);
    frameObject["cmd"] = "update";
    // Only trigger on phase change, not just any toggle
    if (frameObject["round"] === 0 && data.phase !== frameObject["round"]["phase"]) {
      // Do dividends update
      const fields: string[] = ["users", "cash", "pw", "user"];
      const keys = toScriptKeys(data.game, fields);
      const morePartialJson = await ioredis.evalsha(scripts["dividends"], keys.length, ...keys,
        data.users.length, data.game) as string;
      const moreFrameObj = JSON.parse(morePartialJson);
      frameObject["cash"] = moreFrameObj["cash"];
    } else if (frameObject["round"] === 5 && data.phase !== frameObject["round"]["phase"]) {
      // Do good will update
      const fields: string[] = ["users", "cash", "pledge", "pa", "user"];
      const keys = toScriptKeys(data.game, fields);
      const morePartialJson = await ioredis.evalsha(scripts["good-will"], keys.length, ...keys,
        data.users.length, data.game) as string;
      const moreFrameObj = JSON.parse(morePartialJson);
      frameObject["cash"] = moreFrameObj["cash"];
    }
  for (const [aliveClient, clientMeta] of aliveClients)
    if (clientMeta.game === data.game)
      aliveClient.send(JSON.stringify(frameObject));
  } catch (err) {
    client.send(fromScriptError("update", err as Error));
  }
}
