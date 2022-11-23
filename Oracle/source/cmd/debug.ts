import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Debug = {
  cmd: "debug",
  game: string,
  key: string,
  value: string,
  sadd: number
};
export const cmd = "debug";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Debug) {
  try {
    await ioredis.evalsha(scripts["debug"], 1, data.key, 0, data.game, data.value, data.sadd);
  } catch (err) {
    client.send(fromScriptError("debug", err as Error));
  }
}
