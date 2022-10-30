import { Util, RedisReply } from "../Util.js";
// Command
type New = {
  cmd: "new",
  user: string
};
export const cmd = "new";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: New) {
  const gameKey = Date.now().toString(16).padStart(14, "0");
  const newStatus = await ioredis.evalsha(scripts["new"], 0, gameKey) as RedisReply;
  if (newStatus === "OK") {
    const addUserStatus = await ioredis.evalsha(scripts["add-user"], 0, gameKey, data.user) as RedisReply;
    if (addUserStatus === "OK") {
      client.send(JSON.stringify({ cmd: "new", newGame: gameKey }));
    } else {
      client.send(JSON.stringify({ cmd: "new", error: "Failed to add user" }));
    }
  } else {
    client.send(JSON.stringify({ cmd: "new", error: "Failed to create new game" }));
  }
}
