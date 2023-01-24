-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local usersKey = KEYS[1]
local cashKey = KEYS[2]
local pwKey = KEYS[3]
local memberKey = KEYS[4]
local ownKey = KEYS[5]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local username = ARGV[3]
local conname = ARGV[4]
-- Get conglomerate from stock name
local function getCon(stock: string): string
  return string.match(stock, "([^:]*)")
end
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
  -- Check that user exists in game
  local users = redis.call("SMEMBERS", usersKey) as Set
  local userExists = false
  for user in pairs(users.set) do
    if user == username then
      userExists = true
      break
    end
  end
  if userExists then
    local record partial
      cmd: string
      user: {string: {string: {string: number}}}
      cash: {string: number}
    end
    partial.cmd = "update"
    -- Calculate price of membership upgrade
    local tierPrices = {400, 550, 650, 800}
    local upgradePrice = 0
    local ownsStocks = false
    local pw = (redis.call("HGETALL", pwKey) as Hash).map
    local userOwn = (redis.call("HGETALL", ownKey) as Hash).map
    for stock, flavor in pairs(pw) do
      if getCon(stock) == conname then
        local fv = tonumber(flavor) as integer
        if fv > 0 then
          upgradePrice = upgradePrice + tierPrices[fv]
        end
        if ownsStocks == false and tonumber(userOwn[stock]) > 0 then
          ownsStocks = true
        end
      end
    end
    if upgradePrice == 0 then
      -- No public works built yet
      send = redis.error_reply("ENOPW")
      return send
    end
    if ownsStocks == false then
      -- User doesn't own any stocks in the conglomerate
      send = redis.error_reply("ENOOWN")
      return send
    end
    local cash = (redis.call("HGETALL", cashKey) as Hash).map
    local userCash = tonumber(cash[username])
    local newCash = userCash - upgradePrice
    if newCash < 0 then
      -- User doesn't have enough cash
      send = redis.error_reply("ENOCASH")
      return send
    end
    local userMember = (redis.call("HGETALL", memberKey) as Hash).map
    local currentTier = tonumber(userMember[conname])
    if currentTier >= 3 then
      -- User already at max tier
      send = redis.error_reply("EMAXMEMBER")
      return send
    end
    -- Increment user's membership tier
    local newTier = redis.call("HINCRBY", memberKey, conname, "1") as number
    -- Subtract upgrade price from user's cash
    redis.call("HSET", cashKey, username, tostring(newCash))
    -- Reply with the new state fields
    if partial.user == nil then
      partial.user = {}
    end
    if partial.user[username] == nil then
      partial.user[username] = {}
    end
    if partial.user[username]["member"] == nil then
      partial.user[username]["member"] = {}
    end
    partial.user[username]["member"][conname] = newTier
    if partial.cash == nil then
      partial.cash = {}
    end
    partial.cash[username] = newCash
    send = redis.status_reply(cjson.encode(partial))
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
