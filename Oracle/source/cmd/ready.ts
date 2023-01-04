import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Ready = {
  cmd: "ready",
  game: string,
  user: string,
  ready: boolean,
  phase: number,
  "cart-json"?: string[]
};
export const cmd = "ready";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Ready) {
  try {
    // Do round update
    let partialJson = "";
    const baseFields = ["users", "ready", "round"];
    if (data["cart-json"] && (data.phase === 2 || data.phase === 3)) {
      const baseUsers = [data.user];
      const baseUserFields = ["cart-json"];
      const baseKeys = toScriptKeys(data.game, baseFields, baseUsers, baseUserFields);
      partialJson = await ioredis.evalsha(scripts["ready"], baseKeys.length, ...baseKeys,
        1, data.game, data.user, String(data.ready), data["cart-json"].length, ...data["cart-json"]) as string;
    } else {
      const baseKeys = toScriptKeys(data.game, baseFields);
      partialJson = await ioredis.evalsha(scripts["ready"], baseKeys.length, ...baseKeys,
        0, data.game, data.user, String(data.ready), -1) as string;
    }
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
    } else if (partialObj["round"]["phase"] === 2 && data.phase !== partialObj["round"]["phase"]) {
      // Roll for initiative
      const fields = ["users", "init"];
      const keys = toScriptKeys(data.game, fields);
      const morePartialJson = await ioredis.evalsha(scripts["roll-init"], keys.length, ...keys,
        0, data.game) as string;
      const morePartialObj = JSON.parse(morePartialJson);
      partialObj["init"] = morePartialObj["init"];
    } else if (partialObj["round"]["phase"] === 3 && data.phase !== partialObj["round"]["phase"]) {
      // Process the first stock trading window
      // This will push through purchases that work (to whatever extent that is)
      // and send trade offers to their targets
      const fields = ["users", "init", "price", "next-price", "delta"];
      const users = await ioredis.smembers(`game:${data.game}:users`);
      const userFields = ["own", "offers-json"];
      const keys = toScriptKeys(data.game, fields, users, userFields);
      const morePartialJson = await ioredis.evalsha(scripts["trade"], keys.length, ...keys,
        users.length, data.game, "3") as string;
      const morePartialObj = JSON.parse(morePartialJson);
      //partialObj["user"] = morePartialObj["user"];
    } else if (partialObj["round"]["phase"] === 4 && data.phase !== partialObj["round"]["phase"]) {
      // Process the second stock trading window
      // This is responses to trade offers (accept or reject)
      const users = await ioredis.smembers(`game:${data.game}:users`);
      const fields = ["users", "price", "next-price", "delta"];
      const userFields = ["own", "offers-json"];
      const keys = toScriptKeys(data.game, fields, users, userFields);
      const morePartialJson = await ioredis.evalsha(scripts["trade"], keys.length, ...keys,
        users.length, data.game, "4") as string;
      const morePartialObj = JSON.parse(morePartialJson);
      partialObj["user"] = morePartialObj["user"];
      partialObj["price"] = morePartialObj["price"];
      partialObj["delta"] = morePartialObj["delta"];
      // Do public works update, i.e. raise them automatically
      fields.splice(0, fields.length, "pw");
      userFields.pop();
      const moreKeys = toScriptKeys(data.game, fields, users, userFields);
      // Script note: only PWs that have changed in flavor will be returned
      const evenMorePartialJson = await ioredis.evalsha(scripts["raise-pw"], moreKeys.length, ...moreKeys,
        users.length, data.game) as string;
      const evenMorePartialObj = JSON.parse(evenMorePartialJson);
      partialObj["pw"] = evenMorePartialObj["pw"];
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
