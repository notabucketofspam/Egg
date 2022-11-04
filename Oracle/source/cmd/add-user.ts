import { Util } from "../Util.js";
// Command
type AddUser = {
  cmd: "add-user",
  game: string,
  user: string
};
export const cmd = "add-user";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: AddUser) {
  try {
    await ioredis.evalsha(scripts["add-user"], 0, data.game, data.user);
    client.send(JSON.stringify({ cmd: "add-user", ok: true }));
  } catch (err) {
    switch ((err as Error).message) {
      case "ENOUSER": {
        client.send(JSON.stringify({ cmd: "add-user", err: "ENOUSER", why: "The game provided has no such user" }));
        break;
      }
      case "ENOGAME": {
        client.send(JSON.stringify({ cmd: "add-user", err: "ENOGAME", why: "The game provided does not exist" }));
        break;
      }
      default: break;
    }
  }
}