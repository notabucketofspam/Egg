import { checkPasswd, fromHgetall, fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Ready = {
  cmd: "ready",
  game: string,
  passwd?: string,
  user: string,
  ready: boolean,
  "cart-json"?: string[]
};
export const cmd = "ready";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Ready) {
  try {
    await checkPasswd(ioredis, data);
    const round = fromHgetall(await ioredis.hgetall(`game:${data.game}:round`));
    const messages: Messages = {
      cmd: "message",
      events: {}
    };
    // Do round update
    let readyJson = "";
    const readyFields = ["users", "ready", "round"];
    if (data["cart-json"] && (round.phase === 2 || round.phase === 3)) {
      const users = [data.user];
      const userFields = ["cart-json"];
      const keys = toScriptKeys(data.game, readyFields, users, userFields);
      readyJson = await ioredis.evalsha(scripts["ready"], keys.length, ...keys,
        1, data.game, data.user, String(data.ready), data["cart-json"].length, ...data["cart-json"]) as string;
    } else {
      const keys = toScriptKeys(data.game, readyFields);
      readyJson = await ioredis.evalsha(scripts["ready"], keys.length, ...keys,
        0, data.game, data.user, String(data.ready), -1) as string;
    }
    const partial = JSON.parse(readyJson);
    const newPhase = partial["round"]["phase"] as number;
    // Only trigger on phase change, not just any toggle
    if (newPhase === 0 && round.phase !== newPhase) {
      // Do dividends update
      const cash = fromHgetall(await ioredis.hgetall(`game:${data.game}:cash`));
      const fields = ["init", "cash", "pw", "price", "last-cash"];
      const userCount = await ioredis.scard(`game:${data.game}:users`);
      const zusers = await ioredis.zrange(`game:${data.game}:init`, 0, userCount);
      const userFields = ["member", "own"];
      const keys = toScriptKeys(data.game, fields, zusers, userFields);
      const dividendsJson = await ioredis.evalsha(scripts["dividends"], keys.length, ...keys,
        userCount, data.game) as string;
      const dividends = JSON.parse(dividendsJson);
      if (dividends["cash"]) {
        partial["cash"] = dividends["cash"];
        const newRound = { round: partial["round"]["round"], phase: newPhase };
        const message = new Message(newRound, newPhase);
        message.data["dividends"] = {};
        for (const [user, value] of Object.entries(cash))
          message.data["dividends"][user] = dividends["cash"][user] - value;
        postMessage(data.game, ioredis, messages, message);
      }
    } else if (newPhase === 2 && round.phase !== newPhase) {
      // Roll for initiative
      const fields = ["users", "init"];
      const keys = toScriptKeys(data.game, fields);
      const rollInitJson = await ioredis.evalsha(scripts["roll-init"], keys.length, ...keys,
        0, data.game) as string;
      const rollInit = JSON.parse(rollInitJson);
      if (rollInit["init"]) {
        partial["init"] = rollInit["init"];
        // The value of init doesn't matter here, so leave it blank
        const message = new Message(round, newPhase);
        message.data["init"] = {};
        postMessage(data.game, ioredis, messages, message);
      }
    } else if ((newPhase === 3 || newPhase === 4) && round.phase !== newPhase) {
      // Process a stock trading window
      // First will push through purchases that work (to whatever extent that is)
      // and send trade offers to their targets
      // Second is responses to trade offers (accept or reject)
      const fields = ["init", "price", "cash"];
      const userCount = await ioredis.scard(`game:${data.game}:users`);
      const zusers = await ioredis.zrange(`game:${data.game}:init`, 0, userCount);
      const userFields = ["cart-json", "offers-json", "own"];
      const keys = toScriptKeys(data.game, fields, zusers, userFields);
      const tradeJson = await ioredis.evalsha(scripts["trade"], keys.length, ...keys,
        userCount, data.game, newPhase) as string;
      const trade = JSON.parse(tradeJson) as TradeObj;
      if (trade.cash)
        partial["cash"] = trade.cash;
      if (trade.user)
        partial["user"] = trade.user;
      // Actual value of trade doesn't matter (users can use their eyes if they
      // want to know what changed)
      const message = new Message(round, newPhase);
      message.data["trade"] = {};
      postMessage(data.game, ioredis, messages, message);
      // Compute next stock price and either hold it until next phase
      // or overwrite current stock price
      const fields2 = ["price", "next-price", "delta", "pw", "index", "last-time"];
      const keys2 = toScriptKeys(data.game, fields2).concat(trade.list.map(value => value.key));
      const argv = ["0", data.game, String(newPhase), String(fields2.length + 1), "unused", "unused2",
        ...trade.list.map(value => value.json)];
      const stockPriceJson = await ioredis.evalsha(scripts["stock-price"], keys2.length, ...keys2, ...argv) as string;
      if (newPhase === 4) {
        // Only include price / delta updates when they're actually applied
        const stockPrice = JSON.parse(stockPriceJson);
        if (stockPrice["price"])
          partial["price"] = stockPrice["price"];
        if (stockPrice["delta"])
          partial["delta"] = stockPrice["delta"];
        // Users will already see the delta on the page, so no need to repeat it
        const message2 = new Message(round, newPhase);
        message2.data["price"] = {};
        postMessage(data.game, ioredis, messages, message2);
        // Do public works update, i.e. raise them automatically
        const fields3 = ["pw"];
        const userFields3 = ["own"];
        const keys3 = toScriptKeys(data.game, fields3, zusers, userFields3);
        // Script note: only PWs that have changed in flavor will be returned
        const raisePwJson = await ioredis.evalsha(scripts["raise-pw"], keys3.length, ...keys3,
          userCount, data.game) as string;
        const raisePw = JSON.parse(raisePwJson);
        if (raisePw["pw"]) {
          partial["pw"] = raisePw["pw"];
          const message3 = new Message(round, newPhase);
          message3.data["pw"] = raisePw["pw"];
          postMessage(data.game, ioredis, messages, message3);
        }
      }
    } else if (newPhase === 5 && round.phase !== newPhase) {
      // Do good will / pledge update
      const pledge = fromHgetall(await ioredis.hgetall(`game:${data.game}:pledge`));
      const fields = ["init", "cash", "pledge", "pa", "can-trade", "last-cash", "soup"];
      const userCount = await ioredis.scard(`game:${data.game}:users`);
      const zusers = await ioredis.zrange(`game:${data.game}:init`, 0, userCount);
      const userFields = ["last-member", "member"];
      const keys = toScriptKeys(data.game, fields, zusers, userFields);
      const endRoundJson = await ioredis.evalsha(scripts["end-round"], keys.length, ...keys,
        userCount, data.game) as string;
      const endRound = JSON.parse(endRoundJson);
      if (endRound["cash"])
        partial["cash"] = endRound["cash"];
      if (endRound["pa"])
        partial["pa"] = endRound["pa"];
      if (endRound["pledge"]) {
        partial["pledge"] = endRound["pledge"];
        // Reveal pledges from this round
        const message = new Message(round, newPhase);
        message.data["pledge"] = pledge;
        postMessage(data.game, ioredis, messages, message);
      }
      if (typeof endRound["soup"] === "number") {
        partial["soup"] = endRound["soup"];
        const message = new Message(round, newPhase);
        message.data["soup"] = endRound["soup"];
        postMessage(data.game, ioredis, messages, message);
      }
      if (endRound["user"])
        partial["user"] = endRound["user"];
      if (endRound["can-trade"]) {
        partial["can-trade"] = endRound["can-trade"];
        const message = new Message(round, newPhase);
        message.data["can-trade"] = endRound["can-trade"];
        message.data["cannot-trade"] = zusers.filter(user => !endRound["can-trade"].includes(user));
        postMessage(data.game, ioredis, messages, message);
      }
      if (endRound["good-will"]) {
        // Good will isn't included in partial by default, so add it here
        const message = new Message(round, newPhase);
        message.data["good-will"] = endRound["good-will"];
        postMessage(data.game, ioredis, messages, message);
      }
    }
    const partialJson = JSON.stringify(partial);
    const messagesJson = JSON.stringify(messages);
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        aliveClient.send(partialJson);
        aliveClient.send(messagesJson);
      }
    }
  } catch (err) {
    client.send(fromScriptError("update", err as Error));
  }
}
type TradeObj = {
  user?: {
    [user: string]: Record<string, Record<string, number>>
  },
  list: {
    key: string,
    json: string
  }[],
  cash: Record<string, number>
};
class Message {
  round: number;
  phase: number;
  data: Record<string, any> = {};
  constructor(round: Record<string, number>, phase: number) {
    this.round = round.round;
    this.phase = phase;
  }
}
type Messages = {
  cmd: "message",
  events: Record<string, string>
};
/**
 * Post a message to the game's message log
 */
function postMessage(game: string, ioredis: Util["ioredis"],
  messages: Messages, message: Message) {
  let time = Date.now();
  while (typeof messages.events[String(time)] !== "undefined")
    time += 1;
  const messageJson = JSON.stringify(message);
  messages.events[String(time)] = messageJson;
  ioredis.hset(`game:${game}:messages`, time, messageJson);
}
