import { Util } from "../Util.js";
// Command
type ChangePasswd = {
  cmd: "change-passwd",
  game: string,
  del: boolean,
  passwd: string
};
export const cmd = "change-passwd";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: ChangePasswd) {
  const changePasswd: Record<string, string> = { cmd };
  if (data.del) {
    // Delete the password
    ioredis.del(`game:${data.game}:passwd`);
  } else {
    // Set passwd
    ioredis.set(`game:${data.game}:passwd`, data.passwd);
    changePasswd["passwd"] = data.passwd;
  }
  // Alert game clients
  const changePasswdJson = JSON.stringify(changePasswd);
  for (const [aliveClient, clientMeta] of aliveClients)
    if (clientMeta.game === data.game)
      aliveClient.send(changePasswdJson);
}
