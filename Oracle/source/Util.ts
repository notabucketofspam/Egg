// Node setup
import path from "node:path";
import fs from "node:fs";
// WebSocket setup
import WebSocket from "ws";
// Redis / KeyDB setup
import Redis from "ioredis";
// Express setup
import { Request, Response } from "express";
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
export type Util = {
  client: WebSocket,
  aliveClients: Map<WebSocket, ClientMeta>,
  ioredis: Redis,
  scripts: Record<string, string>
};
/**
 * Metadata about a WebSocket client
 */
export type ClientMeta = {
  isAlive: boolean,
  game?: string,
  user?: string
};
/**
 * Custom Express middleware
 */
export type HttpHandler = {
  cmd: string,
  method: string,
  path: string,
  exec: (req: Request, res: Response) => Promise<void>,
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
    if (err.message.startsWith("ERR "))
      err.message = err.message.substring(4);
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
      case "EBADPHASE": {
        // Wrong phase for operation (usually during trading)
        return JSON.stringify({
          cmd, err: err.message,
          why: "Wrong phase for operation", proof
        });
      }
      case "EPASSWD": {
        return JSON.stringify({
          cmd,
          err: err.message,
          why: "Missing or invalid password for game",
          proof
        });
      }
      case "EDELETE": {
        return JSON.stringify({
          cmd,
          err: err.message,
          why: "Game deleted from games set",
          proof
        });
      }
      default: {
        // Unknown error
        return JSON.stringify({ cmd, err: err.name, why: err.message, proof });
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
