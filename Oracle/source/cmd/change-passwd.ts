import { checkPasswd, fromScriptError, Util } from "../Util.js";
// Command
type ChangePasswd = {
  cmd: "change-passwd",
  game: string,
  passwd?: string,
  del: boolean,
  newPasswd: string
};
export const cmd = "change-passwd";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: ChangePasswd) {
  try {
    await checkPasswd(ioredis, data);
    const changePasswd: Record<string, string> = { cmd };
    if (data.del) {
      // Delete the password
      ioredis.del(`game:${data.game}:passwd`);
    } else {
      // Set passwd
      ioredis.set(`game:${data.game}:passwd`, data.newPasswd);
      changePasswd["passwd"] = data.newPasswd;
    }
    // Alert game clients
    const changePasswdJson = JSON.stringify(changePasswd);
    for (const [aliveClient, clientMeta] of aliveClients)
      if (clientMeta.game === data.game)
        aliveClient.send(changePasswdJson);
  } catch (err) {
    client.send(fromScriptError(cmd, err as Error));
  }
}
