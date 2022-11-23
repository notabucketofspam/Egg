import Redis from "ioredis";
import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Patch = {
  cmd: "patch",
  game: string,
  ver: number,
  users: string[]
};
export const cmd = "patch";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Patch) {
  try {
    // Start patching based on the current version
    for (let i = data.ver; i < patches.length; ++i) {
      patches[i](ioredis, scripts, data.game, i, data.users);
    }
    for (const [aliveClient, clientMeta] of aliveClients) {
      if (clientMeta.game === data.game) {
        // Cheating a little bit here: using "add-user" to force the client to
        // send a "load" command back to the server
        aliveClient.send(JSON.stringify({ cmd: "add-user" }));
      }
    }
  } catch (err) {
    client.send(fromScriptError("debug", err as Error));
  }
}
const patches: ((ioredis: Redis, scripts: Record<string, string>,
  game: string, ver: number, users: string[]) => Promise<void>)[] = [
    async (ioredis, scripts, game, ver, users) => {
      // ver 0 -> 1
      // add "last-own" to all users
      const fields = ["ver", "user"];
      const keys = toScriptKeys(game, fields, users);
      await ioredis.evalsha(scripts["patch"], keys.length, ...keys, users.length, game, ver);
  }
];
