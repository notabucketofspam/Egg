-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local usersKey = KEYS[1]
local initKey = KEYS[2]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
-- Generate a unique sequence
local function sequence(users: Set, card: integer, whichKey: string): {string: number}
  local usersTable: {string} = {}
  for user in pairs(users.set) do
    table.insert(usersTable, user)
  end
  local initTable: {string: number} = {}
  local index = 1
  while index ~= card + 1 do
    local newInit = math.random(card)
    local hasInit = false
    for user, init in pairs(initTable) do
      if init == newInit then
        hasInit = true
      end
    end
    if not hasInit then
      redis.call("ZADD", whichKey, tostring(newInit), usersTable[index])
      initTable[usersTable[index]] = newInit
      index = index + 1
    end
  end
  return initTable
end
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameId then
    gameExists = true
  end
end
if gameExists then
  local users = redis.call("SMEMBERS", usersKey) as Set
  local card = redis.call("SCARD", usersKey) as integer
  local record partial
    cmd: string
    init: {string: number}
  end
  partial.cmd = "update"
  local randomseed = tonumber((redis.call("TIME") as {string})[2])
  math.randomseed(randomseed)
  partial.init = sequence(users, card, initKey)
  send = redis.status_reply(cjson.encode(partial))
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
