import { checkPasswd, fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Pledge = {
  cmd: "pledge",
  game: string,
  passwd?: string,
  user: string,
  pledge: number
};
export const cmd = "pledge";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Pledge) {
  const fields: string[] = ["users", "pledge"];
  const keys = toScriptKeys(data.game, fields);
  try {
    await checkPasswd(ioredis, data);
    await ioredis.evalsha(scripts["pledge"], keys.length, ...keys, 0, data.game, data.user, data.pledge);
    const pledge: Record<string, number> = {};
    pledge[data.user] = data.pledge;
    client.send(JSON.stringify({ cmd: "update", pledge }));
  } catch (err) {
    client.send(fromScriptError("pledge", err as Error));
  }
}
