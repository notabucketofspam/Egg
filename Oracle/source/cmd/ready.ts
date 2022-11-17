import { fromScriptError, Util } from "../Util.js";
// Command
type Ready = {
  cmd: "ready",
  game: string,
  user: string,
  ready: boolean
};
export const cmd = "ready";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Ready) {
  try {
    const frameJson = await ioredis.evalsha(scripts["ready"], 0, data.game, data.user, String(data.ready)) as any;
    const frameObject = JSON.parse(frameJson);
    console.log(JSON.stringify({ cmd: "update", ready: frameObject.ready, round: frameObject.round }));
  for (const [aliveClient, clientMeta] of aliveClients)
    if (clientMeta.game === data.game)
      aliveClient.send(JSON.stringify({ cmd: "update", ready: frameObject.ready, round: frameObject.round }));
  } catch (err) {
    client.send(fromScriptError("update", err as Error));
  }
}
