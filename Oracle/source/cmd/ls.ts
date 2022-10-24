import { Util } from "../Util";
// Command
type Ls = {
  cmd: "ls"
};
export const cmd = "ls";
export async function exec({ client, activeGames, ioredis, scripts }: Util, data: Ls) {
  client.send("WIP");
}
