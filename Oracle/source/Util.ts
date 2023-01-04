// Node setup
import path from "node:path";
import fs from "node:fs";
// WebSocket setup
import WebSocket from "ws";
// Redis / KeyDB setup
import Redis from "ioredis";
/**
 * Find all files in a directory tree.
 * @param {fs.Dir} dir The current directory
 * @param {string[]} files A list of file paths
 * @returns {Promise<void>} Basically nothing
 */
export async function readdirRecursive(dir: fs.Dir, files: string[]) {
  for await (const dirent of dir) {
    const direntPath = path.normalize(`${dir.path}/${dirent.name}`);
    if (dirent.isDirectory()) {
      await readdirRecursive(fs.opendirSync(direntPath, { encoding: "utf8" }), files);
    } else if (dirent.isFile()) {
      files.push(direntPath);
    }
  }
}
/**
 * Turn a Redis map reply into an object.
 * @param {RedisReply[]} reply Alternating list of keys (string) and values (RedisReply)
 * @returns {Record<string, RedisReply>} New object with each key set to the respective value
 */
export function fromMapReply(reply: RedisReply[]) {
  const newobj: Record<string, RedisReply> = {};
  for (let index = 0; index < reply.length; index += 2)
    newobj[reply[index] as string] = reply[index + 1];
  return newobj;
}
/**
 * Turn a Redis sorted set reply (ZRANGE) into an object
 * @param {string[]} reply Alternating list of members and scores
 * @returns {Record<string, number>} The new sorted set
 */
export function fromZrange(reply: string[]) {
  const newobj: Record<string, number> = {};
  for (let i = 0; i < reply.length; i += 2)
    newobj[reply[i]] = Number(reply[i + 1]);
  return newobj;
}
/**
 * Turn a Redis hash reply (HGETALL) into an object with values as numbers
 * @param {string[]} reply Object with string fields and number values
 * @returns {Record<string, number>} The new object
 */
export function fromHgetall(reply: Record<string, string>) {
  const newobj: Record<string, number> = {};
  for (const field of Object.keys(reply))
    newobj[field] = Number(reply[field]);
  return newobj;
}
/**
 * Resources for command execution
 */
export declare type Util = {
  client: WebSocket,
  aliveClients: Map<WebSocket, ClientMeta>,
  ioredis: Redis,
  scripts: Record<string, string>
};
/**
 * What an IORedis promise might resolve to.
 */
export declare type RedisReply = string | number | RedisReply[];
/**
 * Metadata about a WebSocket client
 */
export declare type ClientMeta = {
  isAlive: boolean,
  game?: string,
  user?: string
};
/**
 * Construct an appropriate client response to a server error (if there is one)
 * @param {string} cmd The command in question
 * @param {Error} [err] The error from script, if any
 * @param {Record<string, any>} [proof] Evidence for the error, if any
 * @returns {string} JSON string for sending to the client
 */
export function fromScriptError(cmd: string, err?: Error, proof?: Record<string, any>) {
  if (err) {
    switch (err.message) {
      case "ENOGAME": {
        // No game in games set
        return JSON.stringify({ cmd, err: err.message, why: "No game in games set", proof });
      }
      case "ENOUSER": {
        // No user in users set of game
        return JSON.stringify({ cmd, err: err.message, why: "No user in users set of game", proof });
      }
      case "ENOCMD": {
        // Invalid or unexpected command
        return JSON.stringify({ cmd, err: err.message, why: "Invalid or unexpected command", proof });
      }
      case "ENOKEY": {
        // Key does not exist (probably a bad field)
        return JSON.stringify({
          cmd, err: err.message,
          why: `Key does not exist; maybe check property "field" in request`, proof
        });
      }
      case "EPATCH": {
        // Error in patch script
        return JSON.stringify({ cmd, err: err.message, why: "Error in patch script", proof });
      }
      case "EBADVALUE": {
        // Property "value" is malformed (usually from the debug command when modifying a set)
        return JSON.stringify({
          cmd, err: err.message,
          why: `Property "value" is malformed`, proof
        });
      }
      case "EBADTYPE": {
        // Key is not a valid type (only accepts: hash, set, zset, string)
        return JSON.stringify({
          cmd, err: err.message,
          why: "Key is not a valid type (hash, set, zset, string)", proof
        });
      }
      default: {
        // Unknown error
        return JSON.stringify({ cmd, err: err.message, why: "Unknown error", proof });
      }
    }
  } else {
    return JSON.stringify({ cmd, ok: true });
  }
}
/**
 * Get a list of Redis keys for scripts to use, to stay within Redis scripting guidelines.
 * @param {string} game The game key
 * @param {string[]} fields Which fields of State are requested
 * @param {string[]=} users The list of users in the game; needed for some fields
 * @param {string[]=} userFields which per-user fields are needed, as well
 * @returns {string[]} An array of Redis keys
 */
export function toScriptKeys(game: string, fields: string[], users?: string[], userFields?: string[]): string[] {
  const keys: string[] = [];
  fields.forEach(field => {
    keys.push(`game:${game}:${field}`);
  });
  if (users && userFields) {
    users.forEach(user => {
      userFields.forEach(field => {
        keys.push(`game:${game}:user:${user}:${field}`);
      });
    });
  }
  return keys;
}
