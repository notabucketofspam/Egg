import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type New = {
  cmd: "new",
  user: string
};
export const cmd = "new";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: New) {
  const gameId = Date.now().toString(16).padStart(14, "0");
  try {
    const fields = ["index", "price", "delta", "pw", "round", "ver", "next-price", "soup"];
    const keys = toScriptKeys(gameId, fields);
    await ioredis.evalsha(scripts["new"], keys.length, ...keys, 0, gameId, `game:${gameId}:trade:`);
    try {
      const fields = ["users", "pledge", "can-trade", "pa", "cash", "init"];
      const users = [data.user];
      const userFields = ["last-member", "member", "own"];
      const keys = toScriptKeys(gameId, fields, users, userFields);
      await ioredis.evalsha(scripts["add-user"], keys.length, ...keys,
        1, gameId, data.user);
      client.send(JSON.stringify({ cmd: "new", newGame: gameId }));
    } catch (err) {
      client.send(fromScriptError("new", err as Error));
    }
  } catch (err) {
    // Theoretically, there should be no way for new.tl to fail,
    // but on the 0.01% chance that it does, fail silently and let the
    // user try again
    //client.send(fromScriptError("new", new Error("EUNKNOWN")));
  }
}
