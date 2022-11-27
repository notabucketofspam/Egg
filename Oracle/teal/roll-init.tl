-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local usersKey = KEYS[1]
local initKey = KEYS[2]
local secondInitKey = KEYS[3]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local initPhase = tonumber(ARGV[3])
-- Generate a unique sequence
local function sequence(users: Set, card: integer): {string: number}
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
    ["second-init"]: {string: number}
  end
  partial.cmd = "update"
  local randomseed = tonumber((redis.call("TIME") as {string})[2])
  math.randomseed(randomseed)
  -- Check which initiative phase this is
  if initPhase == 1 then
    -- "Stock Trading"
    partial.init = sequence(users, card)
  elseif initPhase == 2 then
    -- "Second-Chance Stock Trading"
    partial["second-init"] = sequence(users, card)
  else
    -- Not the right phase for initiative / second initiative
    send = redis.error_reply("EBADPHASE")
    return send
  end
  send = redis.status_reply(cjson.encode(partial))
else
-- No game in games set
send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
