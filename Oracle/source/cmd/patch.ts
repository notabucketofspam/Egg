import Redis from "ioredis";
import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Patch = {
  cmd: "patch",
  game: string,
  ver: number
};
export const cmd = "patch";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Patch) {
  const users = await ioredis.smembers(`game:${data.game}:users`);
  // Start patching based on the current version
  for (let i = data.ver; i < patches.length; ++i) {
    if (await patches[i](ioredis, scripts, data.game, i, users)) {
      client.send(fromScriptError("patch", new Error("EPATCH")));
      break;
    }
  }
  for (const [aliveClient, clientMeta] of aliveClients) {
    if (clientMeta.game === data.game) {
      // Force all clients to reload the page upon patch;
      // this avoids any breaking discrepancies between model / view in Angular
      aliveClient.send(JSON.stringify({ cmd: "reload" }));
    }
  }
}
const patches: ((ioredis: Redis, scripts: Record<string, string>,
  game: string, ver: number, users: string[]) => Promise<boolean>)[] = [
    async (ioredis, scripts, game, ver, users) => {
      // ver 0 -> 1
      // add "last-own" to all users
      try {
        const fields = ["ver"];
        const userFields = ["last-own"];
        const keys = toScriptKeys(game, fields, users, userFields);
        await ioredis.evalsha(scripts["patch"], keys.length, ...keys, users.length, game, ver);
        return false;
      } catch (err) {
        return true;
      }
    },
    async (ioredis, scripts, game, ver, users) => {
      try {
        // ver 1 -> 2
        // add "last-member" to all users
        const fields = ["ver"];
        const userFields = ["last-member"];
        const keys = toScriptKeys(game, fields, users, userFields);
        await ioredis.evalsha(scripts["patch"], keys.length, ...keys, users.length, game, ver);
        return false;
      } catch (err) {
        return true;
      }
    },
    async (ioredis, scripts, game, ver, users) => {
      try {
        // ver 2 -> 3
        // remove "last-own" for all users (ironic)
        const fields = ["ver"];
        const userFields = ["last-own"];
        const keys = toScriptKeys(game, fields, users, userFields);
        await ioredis.evalsha(scripts["patch"], keys.length, ...keys, users.length, game, ver);
        return false;
      } catch (err) {
        return true;
      }
    }
];
