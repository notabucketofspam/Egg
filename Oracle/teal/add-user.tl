-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- List of conglomerates / stocks (products) and their initial prices / values
local hsetConglomerates = {
  "Cathy:CREAM", "0", "Cathy:BEER", "0", "Cathy:CRUNCH", "0", "Cathy:ROLL", "0",
  "Terry:TOWER", "0", "Terry:TAP", "0", "Terry:TIME", "0", "Terry:TENT", "0",
  "Gary:CALC", "0", "Gary:GUI", "0", "Gary:GLIT", "0", "Gary:GPU", "0",
  "Doug:CANN", "0", "Doug:DOOD", "0", "Doug:DUG", "0", "Doug:CLUB", "0"
}
-- Script params
local usersKey = KEYS[1]
local pledgeKey = KEYS[2]
local canTradeKey = KEYS[3]
local paKey = KEYS[4]
local cashKey = KEYS[5]
local initKey = KEYS[6]
local lastCashKey = KEYS[7]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local username = ARGV[3]
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameId then
    gameExists = true
    break
  end
end
if gameExists then
  -- Add new user data
  redis.call("SADD", usersKey, username)
  redis.call("HSET", pledgeKey, username, "0")
  redis.call("SADD", canTradeKey, username)
  redis.call("HSET", paKey, username, "0")
  redis.call("HSET", cashKey, username, "3000")
  redis.call("ZADD", initKey, "0", username)
  redis.call("HSET", lastCashKey, username, "3000")
  redis.call("HSET", KEYS[8], unpack(hsetConglomerates))
  redis.call("HSET", KEYS[9], unpack(hsetConglomerates))
  redis.call("HSET", KEYS[10], unpack(hsetConglomerates))
  send = redis.status_reply("OK")
else
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
