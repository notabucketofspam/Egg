-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string} = {}
-- Script params
local usersKey = KEYS[1]
local cashKey = KEYS[2]
local pledgeKey = KEYS[3]
local paKey = KEYS[4]
-- NOTE there is also the set of "user[name]..." keys;
-- the order is: "last-own", member, offers, own
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameId then
    gameExists = true
  end
end
if gameExists then
  -- Don't need to check if user exists in game,
  -- since this applies to all users
  --
  -- Need "member" for membership benefits of Cathy, Terry, and Gary
  -- (which is KEYS[5 + 4*n]), "pledge" for good will,
  -- and also "pa" for good will
  --
  -- Setup new state params
  local partialState = {
    cash: {string: number} = {},
    cmd = "update"
  }
  -- 15% of total player pledges is added to good will each turn
  local gwPledge = 0.15
  -- 10% of public account is added to good will each turn
  local gwPa = 0.1
  -- Tables for membership bonuses
  local cathyTable = {0, 0.15, 0.2, 0.25}
  local TerryTable = {0, 0.05, 0.1, 0.2}
  local garyTable = {0, 0.15, 0.2, 0.3}
  -- Current cash of all users
  local cashTable = (redis.call("HGETALL", cashKey) as Map).map
  -- Current pledges
  local pledgeTable = (redis.call("HGETALL", pledgeKey) as Map).map
  -- Current public account total
  local paTable = (redis.call("HGETALL", paKey) as Map).map
  -- Math time
  local users = redis.call("SMEMBERS", usersKey) as Set
  for user in pairs(users.set) do
    local newCash = tonumber(cashTable[user])
    partialState.cash[user] = newCash
  end
  send["ok"] = cjson.encode(partialState)
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
