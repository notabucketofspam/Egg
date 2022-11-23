import { fromScriptError, toScriptKeys, Util } from "../Util.js";
// Command
type Debug = {
  cmd: "debug",
  game: string
};
export const cmd = "debug";
export async function exec({ client, aliveClients, ioredis, scripts }: Util, data: Debug | PartialState) {
  const keys: string[] = [];
  const values: string[] = [];
  dataToKeysValues(data, keys, values);
  console.log("keys", keys, "values", values);
  const scriptKeys = toScriptKeys(data.game as string, keys);
  try {

  } catch (err) {
    client.send(fromScriptError("debug", err as Error));
  }
}
declare interface PartialState {
  [key: string | number]: string | number | PartialState;
}
function dataToKeysValues(partial: PartialState, keys: string[], values: string[], parentKey?: string, out?: string) {
  for (const [key, value] of Object.entries(partial)) {
    if (key === "cmd" || key === "game") {
      // Skip these, as they are not valid State fields
      continue;
    } else if (typeof value === "string" || typeof value === "number" && !parentKey) {
      // partial is a set or hash and has no parent, so the base field is valid
      keys.push(key);
      values.push(String(value));
    } else if (typeof value === "string" || typeof value === "number" && parentKey) {
      // partial is a child set or hash of another field
      return out + ":" + key;
    } else if (typeof value === "object" && parentKey) {
      // partial has child fields
      keys.push(dataToKeysValues(partial[parentKey] as PartialState, keys, values, key, key) as string);
      values.push(String(value));
    }
  }
}
