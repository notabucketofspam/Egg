// Node setup
import path from "node:path";
import fs from "node:fs";
// WebSocket setup
import WebSocket from "ws";
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
 * @param {string[]} reply Alternating list of keys and values
 * @returns {Record<string, string>} New object with each key set to the respective value
 */
export function fromMapReply(reply: string[]) {
  const newobj: Record<string, string> = {};
  for (let index = 0; index < reply.length; index += 2)
    newobj[reply[index]] = reply[index + 1];
  return newobj;
}
/**
 * Resources for command execution
 */
export type Util = {
  client: WebSocket,
  activeGames: Map<string, Map<WebSocket, string>>
};