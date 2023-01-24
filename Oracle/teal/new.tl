-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local indexKey = KEYS[1]
local priceKey = KEYS[2]
local deltaKey = KEYS[3]
local pwKey = KEYS[4]
local roundKey = KEYS[5]
local verKey = KEYS[6]
local nextPriceKey = KEYS[7]
local soupKey = KEYS[8]
local lastTimeKey = KEYS[9]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local indexPrefix = ARGV[3]
-- List of conglomerates / stocks (products) and their initial prices / values
local hsetConglomerates = {
  "Cathy:CREAM", "0", "Cathy:BEER", "0", "Cathy:CRUNCH", "0", "Cathy:ROLL", "0",
  "Terri:TOWER", "0", "Terri:TAP", "0", "Terri:TIME", "0", "Terri:TENT", "0",
  "Gary:CALC", "0", "Gary:GUI", "0", "Gary:GLIT", "0", "Gary:GPU", "0",
  "Doug:CANN", "0", "Doug:DOOD", "0", "Doug:DUG", "0", "Doug:CLUB", "0"
}
local hsetConglomeratesPrice = {
  "Cathy:CREAM", "135", "Cathy:BEER", "135", "Cathy:CRUNCH", "135", "Cathy:ROLL", "135",
  "Terri:TOWER", "135", "Terri:TAP", "135", "Terri:TIME", "135", "Terri:TENT", "135",
  "Gary:CALC", "135", "Gary:GUI", "135", "Gary:GLIT", "135", "Gary:GPU", "135",
  "Doug:CANN", "135", "Doug:DOOD", "135", "Doug:DUG", "135", "Doug:CLUB", "135"
}
-- Add game data
redis.call("SADD", "games", gameId)
redis.call("FT.CREATE", indexKey, "PREFIX", "1", indexPrefix, "SCHEMA", "con", "TAG", "CASESENSITIVE")
redis.call("HSET", priceKey, unpack(hsetConglomeratesPrice))
redis.call("HSET", deltaKey, unpack(hsetConglomerates))
redis.call("HSET", pwKey, unpack(hsetConglomerates))
redis.call("HSET", roundKey, "round", "0", "phase", "0")
redis.call("SET", verKey, "9")
redis.call("HSET", nextPriceKey, unpack(hsetConglomeratesPrice))
redis.call("SET", soupKey, "0")
local timeString = (redis.call("TIME") as {string})[1]
redis.call("SET", lastTimeKey, timeString)
-- Final reply
send = redis.status_reply("OK")
return send
