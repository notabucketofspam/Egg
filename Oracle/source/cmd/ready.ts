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
    const newPhase = partialObj["round"]["phase"];
    // Only trigger on phase change, not just any toggle
    if (newPhase === 0 && data.phase !== newPhase) {
      // Do dividends update
      const fields: string[] = ["users", "cash", "pw"];
      const users = await ioredis.smembers(`game:${data.game}:users`);
      const userFields = ["last-member", "member", "own"];
      const keys = toScriptKeys(data.game, fields, users, userFields);
      const morePartialJson = await ioredis.evalsha(scripts["dividends"], keys.length, ...keys,
        users.length, data.game) as string;
      const morePartialObj = JSON.parse(morePartialJson);
      partialObj["cash"] = morePartialObj["cash"];
    } else if (newPhase === 2 && data.phase !== newPhase) {
      // Roll for initiative
      const fields = ["users", "init"];
      const keys = toScriptKeys(data.game, fields);
      const morePartialJson = await ioredis.evalsha(scripts["roll-init"], keys.length, ...keys,
        0, data.game) as string;
      const morePartialObj = JSON.parse(morePartialJson);
      partialObj["init"] = morePartialObj["init"];
    } else if ((newPhase === 3 || newPhase === 4) && data.phase !== newPhase) {
      // Process a stock trading window
      // First will push through purchases that work (to whatever extent that is)
      // and send trade offers to their targets
      // Second is responses to trade offers (accept or reject)
      const fields = ["init", "price", "cash", "round"];
      const userCount = await ioredis.scard(`game:${data.game}:users`);
      const zusers = await ioredis.zrange(`game:${data.game}:init`, 0, userCount, "REV");
      const userFields = ["cart-json", "offers-json", "own"];
      const keys = toScriptKeys(data.game, fields, zusers, userFields);
      const tradeJson = await ioredis.evalsha(scripts["trade"], keys.length, ...keys,
        userCount, data.game, newPhase) as string;
      const tradeObj = JSON.parse(tradeJson) as TradeObj;
      partialObj["cash"] = tradeObj.cash;
      if (tradeObj.user)
        partialObj["user"] = tradeObj.user;
      // Compute next stock price and either hold it until next phase
      // or overwrite current stock price
      fields.splice(0, fields.length, "price", "next-price", "delta", "pw", "index", "round");
      // keys and argv are the same length to simplify the math in Teal
      keys.splice(0, keys.length, ...toScriptKeys(data.game, fields),
        ...tradeObj.list.map(value => value.key));
      const argv = ["0", data.game, `${newPhase}`, fields.length + 1, "unused", "unused2",
        ...tradeObj.list.map(value => value.json)];
      const stockPriceJson = await ioredis.evalsha(scripts["stock-price"], keys.length, ...keys, ...argv) as string;
      if (newPhase === 4) {
        // Only include price / delta updates when they're actually applied
        const stockPriceObj = JSON.parse(stockPriceJson);
        partialObj["price"] = stockPriceObj["price"];
        partialObj["delta"] = stockPriceObj["delta"];
        // Do public works update, i.e. raise them automatically
        fields.splice(0, fields.length, "pw");
        userFields.splice(0, userFields.length, "own");
        const moreKeys = toScriptKeys(data.game, fields, zusers, userFields);
        // Script note: only PWs that have changed in flavor will be returned
        const morePartialJson = await ioredis.evalsha(scripts["raise-pw"], moreKeys.length, ...moreKeys,
          userCount, data.game) as string;
        const morePartialObj = JSON.parse(morePartialJson);
        partialObj["pw"] = morePartialObj["pw"];
      }
    } else if (newPhase === 5 && data.phase !== newPhase) {
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
type TradeObj = {
  user?: {
    [user: string]: Record<string, number>
  },
  list: {
    key: string,
    json: string
  }[],
  cash: Record<string, number>
};
