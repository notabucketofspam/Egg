import { Util } from "../Util.js";
// Command
type Load = {
  cmd: "load",
  game: string,
  user: string
};
export const cmd = "load";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Load) {
  // Client is guaranteed to be alive because it just sent a message
  const clientMeta = aliveClients.get(client)!;
  clientMeta.game = data.game;
  clientMeta.user = data.user;
  const send: Record<string, any> = {
    cmd: "load",
    user: { }
  };
  send.users = await ioredis.smembers(`game:${data.game}:users`);
  if (!send.users.includes(data.user))
    send.err = "ENOUSER Current user is not in users set";
  else
    await Promise.all([
      ioredis.hgetall(`game:${data.game}:price`).then(reply => send.price = reply),
      ioredis.hgetall(`game:${data.game}:delta`).then(reply => send.delta = reply),
      ioredis.hgetall(`game:${data.game}:pw`).then(reply => send.pw = reply),
      ioredis.hgetall(`game:${data.game}:round`).then(reply => send.round = reply),
      Promise.all(send.users.map((user: string) => 
        send.user[user] = {} &&
        Promise.all([
          ioredis.hgetall(`game:${data.game}:user:${user}:own`).then(reply => send.user[user].own = reply),
          ioredis.hgetall(`game:${data.game}:user:${user}:member`).then(reply => send.user[user].member = reply)
        ])
      )),
      ioredis.smembers(`game:${data.game}:ready`).then(users => send.ready = users),
      ioredis.hgetall(`game:${data.game}:pledge`).then(reply => send.pledge = reply),
      ioredis.smembers(`game:${data.game}:can-trade`).then(reply => send["can-trade"] = reply),
      ioredis.hgetall(`game:${data.game}:pa`).then(reply => send.pa = reply),
      ioredis.hgetall(`game:${data.game}:cash`).then(reply => send.cash = reply),
    ]);
  client.send(JSON.stringify(send));
}
