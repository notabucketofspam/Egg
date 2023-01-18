-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local usersKey = KEYS[1]
local memberKey = KEYS[2]
local cashKey = KEYS[3]
local pwKey = KEYS[4]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local username = ARGV[3]
local stockname = ARGV[4]
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
    local newTiers: {string: number} = {}
    local conName = getCon(stockname)
    -- Calculate price of membership upgrade
    local tierPrices = {0, 400, 550, 650, 800}
    local upgradePrice = 0
    local pw = redis.call("HGETALL", pwKey) as Hash
    for pwStock, pwType in pairs(pw.map) do
      if getCon(pwStock) == conName then
        upgradePrice = upgradePrice + tierPrices[tonumber(pwType) as integer + 1]
        -- Increment user's membership tier
        newTiers[pwStock] = redis.call("HINCRBY", memberKey, pwStock, "1") as number
      end
    end
    -- Subtract upgrade price from user's cash
    local newCash = redis.call("HINCRBYFLOAT", cashKey, username, tostring(-upgradePrice)) as number
    -- Reply with the new state params
    local partialState = {
      user: {string: {string: {string: number}}} = {},
      cash: {string: number} = {},
      cmd = "update"
    }
    partialState.user[username] = {
      member = newTiers
    }
    partialState.cash[username] = newCash
    send = redis.status_reply(cjson.encode(partialState))
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
