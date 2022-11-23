import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Member = {
  cmd: "member",
  game: string,
  user: string,
  stock: string
};
export const cmd = "member";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Member) {
  const keys: string[] = [
    `game:${data.game}:users`,
    `game:${data.game}:user:${data.user}:member`,
    `game:${data.game}:cash`,
    `game:${data.game}:pw`
  ];
  try {
    const partialJson = await ioredis.evalsha(scripts["member"], keys.length, ...keys,
      0, data.game, data.user, data.stock) as string;
    for (const [aliveClient, clientMeta] of aliveClients)
      if (clientMeta.game === data.game)
        aliveClient.send(partialJson);
  } catch (err) {
    client.send(fromScriptError("member", err as Error));
  }
}
