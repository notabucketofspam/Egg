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
 * Resources for command execution
 */
export declare type Util = {
  client: WebSocket,
  activeGames: Map<string, Map<WebSocket, string>>,
  ioredis: Redis,
  scripts: Record<string, string>
};
/**
 * What an IORedis promise might resolve to.
 */
export declare type RedisReply = string | number | RedisReply[];
