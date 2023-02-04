import { fromScriptError, Util } from "../Util.js";
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
    // Check game password
    const gamePasswd = await ioredis.get(`game:${data.game}:passwd`);
    if (gamePasswd !== null) {
      const mainPasswd = await ioredis.get("main-passwd");
      if (data.passwd !== gamePasswd && data.passwd !== mainPasswd) {
        throw new Error("EPASSWD");
      }
    }
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
