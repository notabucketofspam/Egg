import { fromHgetall, fromZrange, fromScriptError, Util } from "../Util.js";
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
  const games = await ioredis.smembers("games");
  if (!games.includes(data.game))
    return client.send(fromScriptError("load", new Error("ENOGAME"), { games, game: data.game }));
  send.users = await ioredis.smembers(`game:${data.game}:users`);
  if (!send.users.includes(data.user))
    return client.send(fromScriptError("load", new Error("ENOUSER"),
      { users: send.users, user: data.user, game: data.game }));
  else
    await Promise.all([
      ioredis.hgetall(`game:${data.game}:price`).then(reply => send.price = fromHgetall(reply)),
      ioredis.hgetall(`game:${data.game}:delta`).then(reply => send.delta = fromHgetall(reply)),
      ioredis.hgetall(`game:${data.game}:pw`).then(reply => send.pw = fromHgetall(reply)),
      ioredis.hgetall(`game:${data.game}:round`).then(reply => send.round = fromHgetall(reply)),
      Promise.all(send.users.map((user: string) => 
        send.user[user] = {} &&
        Promise.all([
          ioredis.hgetall(`game:${data.game}:user:${user}:own`)
            .then(reply => send.user[user].own = fromHgetall(reply)),
          ioredis.hgetall(`game:${data.game}:user:${user}:member`)
            .then(reply => send.user[user].member = fromHgetall(reply)),
          ioredis.smembers(`game:${data.game}:user:${user}:offers`)
            .then(reply => send.user[user].offers = user === data.user ? reply.map(item => JSON.parse(item)) : []),
          ioredis.hgetall(`game:${data.game}:user:${user}:last-own`)
            .then(reply => send.user[user].own = fromHgetall(reply))
        ])
      )),
      ioredis.smembers(`game:${data.game}:ready`).then(reply => send.ready = reply),
      ioredis.hgetall(`game:${data.game}:pledge`).then(reply => send.pledge = fromHgetall(reply))
        .then(() => send.users
          .forEach((user: string) => user === data.user ? 0 : send.pledge[user] -= send.pledge[user])),
      ioredis.smembers(`game:${data.game}:can-trade`).then(reply => send["can-trade"] = reply),
      ioredis.hgetall(`game:${data.game}:pa`).then(reply => send.pa = fromHgetall(reply)),
      ioredis.hgetall(`game:${data.game}:cash`).then(reply => send.cash = fromHgetall(reply)),
      ioredis.zrange(`game:${data.game}:init`, 0, 6, "WITHSCORES")
        .then(reply => send.init = fromZrange(reply)),
      ioredis.zrange(`game:${data.game}:second-init`, 0, 6, "WITHSCORES")
        .then(reply => send["second-init"] = fromZrange(reply)),
      ioredis.get(`game:${data.game}:ver`).then(reply => send.ver = reply === null ? 0 : Number(reply)),
      ioredis.get("global-ver").then(reply => send["global-ver"] = reply === null ? 0 : Number(reply))
    ]);
  client.send(JSON.stringify(send));
}
