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
