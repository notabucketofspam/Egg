-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local initKey = KEYS[1]
local cashKey = KEYS[2]
local pwKey = KEYS[3]
local priceKey = KEYS[4]
local lastCashKey = KEYS[5]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
-- User fields are: member, own
local function getKey(i: number, key: string): string 
  if key == "member" then
    return KEYS[4 + 2*i as integer]
  elseif key == "own" then
    return KEYS[5 + 2*i as integer]
  end
end
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
  -- Setup new state params
  local record partial
    cash: {string: number}
  end
  -- Payout of stock based on which public work is built
  local flavor = {0.15, 0.25, 0.35, 0.5}
  -- Bonuses of Doug tiers
  local dougMult = {1.15, 1.2, 1.25}
  local cash = (redis.call("HGETALL", cashKey) as Hash).map
  local pw = (redis.call("HGETALL", pwKey) as Hash).map
  local price = (redis.call("HGETALL", priceKey) as Hash).map
  -- Math time
  local zusers = redis.call("ZRANGE", initKey, "0", ARGV[1]) as {string}
  for i = 1 as integer, #zusers do
    local user = zusers[i]
    local newcash = tonumber(cash[user])
    local member = (redis.call("HGETALL", getKey(i, "member")) as Hash).map
    local dougTier = tonumber(member["Doug"]) as integer
    local own = (redis.call("HGETALL", getKey(i, "own")) as Hash).map
    for com, count in pairs(own) do
      local pwFlavor = tonumber(pw[com]) as integer
      if pwFlavor > 0 then
        local payout = tonumber(own[com])*tonumber(price[com])*flavor[pwFlavor]
        if dougTier > 0 and getCon(com) == "Doug" then
          payout = payout*dougMult[dougTier]
        end
        newcash = newcash + payout
      end
    end
    if partial.cash == nil then
      partial.cash = {}
    end
    partial.cash[user] = newcash
    redis.call("HSET", cashKey, user, tostring(newcash))
  end
  -- Reset last-cash to current cash in Redis
  local cashDump = redis.call("DUMP", cashKey) as string
  redis.call("RESTORE", lastCashKey, "0", cashDump, "REPLACE")
  send = redis.status_reply(cjson.encode(partial))
  -- Return to user
  send = redis.status_reply(cjson.encode(partial))
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
