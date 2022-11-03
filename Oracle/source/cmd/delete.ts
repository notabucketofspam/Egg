import { Util } from "../Util.js";
// Command
type Delete = {
  cmd: "delete",
  game: string
};
export const cmd = "delete";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Delete) {
  const status = await ioredis.evalsha(scripts["delete"], 0, data.game);
}
