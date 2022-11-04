import { fromScriptError, Util } from "../Util.js";
// Command
type New = {
  cmd: "new",
  user: string
};
export const cmd = "new";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: New) {
  const gameKey = Date.now().toString(16).padStart(14, "0");
  try {
    await ioredis.evalsha(scripts["new"], 0, gameKey);
    try {
      await ioredis.evalsha(scripts["add-user"], 0, gameKey, data.user);
      client.send(JSON.stringify({ cmd: "new", newGame: gameKey }));
    } catch (err) {
      client.send(fromScriptError("new", err as Error));
    }
  } catch (err) {
    client.send(fromScriptError("new", new Error("EUNKNOWN")));
  }
}
