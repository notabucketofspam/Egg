-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string} = {}
-- List of conglomerates / stocks (products) and their initial prices / values
-- Script params
local usersKey = KEYS[1]
local cashKey = KEYS[2]
local pwKey = KEYS[3]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local username = ARGV[3]
local stockname = ARGV[4]
local flavor = tonumber(ARGV[5])
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameId then
    gameExists = true
  end
end
if gameExists then
  -- Check that user exists in game
  local users = redis.call("SMEMBERS", usersKey) as Set
  local userExists = false
  for user in pairs(users.set) do
    if user == username then
      userExists = true
    end
  end
  if userExists then
    -- Set new PW flavor
    redis.call("HSET", pwKey, stockname, tostring(flavor))
    -- Subtract from user's cash
    local feeTable = {0, 250, 350, 450, 600}
    local newCash = redis.call("HINCRBY", cashKey, username, tostring(-feeTable[1 + flavor as integer])) as number
    -- Reply with the new state params
    local partialState = {
      cash: {string: number} = {},
      pw: {string: number} = {},
      cmd = "update"
    }
    partialState.cash[username] = newCash
    partialState.pw[stockname] = flavor
    send["ok"] = cjson.encode(partialState)
  else
    -- No user in game
    send = redis.error_reply("ENOUSER")
  end
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
