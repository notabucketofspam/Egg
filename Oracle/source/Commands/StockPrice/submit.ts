// Express setup
import * as Express from "express";
// Node sertup
import crypto from "node:crypto";
// Oracle setup
import * as Oracle from "Oracle";
// Other setup
/**
 * Create a submission key with 56-bit timestamp and 96-bit random suffix.
 */
function generateSubkey() {
  const timestamp = Date.now().toString(16).padStart(14, "0");
  const key0 = crypto.randomInt(Math.pow(2, 48) - 1).toString(16).padStart(12, "0");
  const key1 = crypto.randomInt(Math.pow(2, 48) - 1).toString(16).padStart(12, "0");
  return `sub:${timestamp}${key0}${key1}`;
}
const submissionKeys = [ "end", "ind", "start", "terr", "time", "win" ];
// Command
export const name = "submit";
export async function exec(request: Express.Request, response: Express.Response) {
  const oregano: Oracle.Oregano = request.app.locals.oregano;
  const submission = request.body as Oracle.Submission;
  const errorMessages = errorCheck(submission);
  if (errorMessages.length)
    return [400, { error: errorMessages.join("\n<br>\n") }];
  const subkey = generateSubkey();
  await oregano.ioredis.evalsha(oregano.scripts["StockPrice"], 1, subkey, "submit",
    ...(Object.entries(submission).filter(([key, value]) => submissionKeys.includes(key)).flat()));
  return [200, { subkey }];
}
/**
 * Which territories are in what industry.
 */
const industryRegistry: Record<string, string[]> = {
  Black: ["Charlie", "Kilo", "Romeo", "Zulu"],
  Blue: ["Zero", "One"],
  Brown: ["Alpha", "Bravo"],
  Cyan: ["Delta", "Echo", "Foxtrot"],
  Green: ["Whiskey", "X-ray", "Yankee"],
  Magenta: ["Golf", "India", "Juliett"],
  Orange: ["Lima", "Mike", "November"],
  Red: ["Oscar", "Papa", "Quebec"],
  White: ["Hotel", "Uniform"],
  Yellow: ["Sierra", "Tango", "Victor"]
};
/**
 * Verify user submission.
 * @param {Oracle.Submission} submission The form submission to validate
 * @returns {string[]} List of problems found with the submission, if any
 */
function errorCheck(submission: Oracle.Submission) {
  const errorMessages: string[] = [];
  // All properties of submission must exist
  if (!(typeof submission === "object" && Object.keys(submission).length)) {
    errorMessages.push("submission is either not an object or contains no data.");
    return errorMessages;
  }
  const industryExists = typeof submission.ind === "string";
  if (!industryExists)
    errorMessages.push("ind is not a string.");
  const stockCountEndExists = typeof submission.end === "number";
  if (!stockCountEndExists)
    errorMessages.push("end is not a number.");
  const stockCountStartExists = typeof submission.start === "number";
  if (!stockCountStartExists)
    errorMessages.push("start is not a number.");
  const territoryExists = typeof submission.terr === "string";
  if (!territoryExists)
    errorMessages.push("terr is not a string.");
  const timestampExists = typeof submission.time === "number";
  if (!timestampExists)
    errorMessages.push("time is not a number.");
  const winExists = typeof submission.win === "boolean";
  if (!winExists)
    errorMessages.push("win is not a boolean.");
  // Numeric values must be in range
  const stockCountEndInRange = stockCountEndExists && submission.end >= 0 &&
    submission.end <= 10;
  const stockCountStartInRange = stockCountStartExists && submission.start >= 1 &&
    submission.start <= 10;
  const timestampInRange = timestampExists && submission.time <= Date.now();
  // Timestamp out of range
  if (timestampExists && !timestampInRange)
    errorMessages.push("Timestamp out of range.");
  // Stock count end out of range
  if (stockCountEndExists && !stockCountEndInRange)
    errorMessages.push("Stock count end out of range.");
  // Stock count start out of range
  if (stockCountStartExists && !stockCountStartInRange)
    errorMessages.push("Stock count start out of range.");
  // Not an industry or territory
  if (industryExists)
    if (!Object.keys(industryRegistry).includes(submission.ind))
      errorMessages.push(`${submission.ind} is not an industry.`);
    else if (territoryExists && !industryRegistry[submission.ind].includes(submission.terr))
      errorMessages.push(`${submission.ind} does not contain ${submission.terr}.`);
  // Won with zero stocks left
  if (winExists && stockCountEndInRange && submission.win && submission.end === 0)
    errorMessages.push("Cannot win with zero stocks left.");
  // Ended with more stocks than started with
  if (stockCountEndInRange && stockCountStartInRange && submission.end > submission.start)
    errorMessages.push("Cannot end with more stocks than started with.");
  return errorMessages;
}
