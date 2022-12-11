-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local usersKey = KEYS[1]
local cashKey = KEYS[2]
local pwKey = KEYS[3]
-- NOTE there is also the set of "user[name]..." keys;
-- the order is (in this case): last-member, member, own
-- The formula is effectively KEYS[(x + n*(i - 1)) as integer], where
-- x is start of user keys, n is number of user keys, and i is loop index
-- (up to userCount), which can be simplified through arithmetic
-- order-of-operations to KEYS[(x - n + n*i) as integer]
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
  --
  -- Set "last-member" equal to "member" for all
  for i = 1, userCount do
    local lastMemberTable = (redis.call("HGETALL", KEYS[(4 + 3*i) as integer]) as Hash).map
    local memberTable = (redis.call("HGETALL", KEYS[(5 + 3*i) as integer]) as Hash).map
    for stock in pairs(lastMemberTable) do
      if lastMemberTable[stock] ~= memberTable[stock] then
        local newTier = tostring(memberTable[stock])
        local lastMemberKey = KEYS[(1 + 3*i) as integer]
        redis.call("HSET", lastMemberKey, stock, newTier)
      end
    end
  end
  -- Need "member" for basically just Doug (which is KEYS[2 + 3*i]),
  -- "own" for dividends direct from stocks (which is KEYS[3 + 3*i]),
  -- and "pw" for dividend %
  --
  -- Setup new state params
  local partialState = {
    cash: {string: number} = {},
    cmd = "update"
  }
  -- Payout of stock based on which public work is built
  local dividendsTable = {0, 0.15, 0.25, 0.35, 0.5}
  -- Bonuses of Doug tiers
  local dougTable = {0, 0.15, 0.2, 0.25}
  -- Current cash of all users
  local cashTable = (redis.call("HGETALL", cashKey) as Hash).map
  -- Which public works are built and where
  local pwTable = (redis.call("HGETALL", pwKey) as Hash).map
  -- Math time
  local users = redis.call("SMEMBERS", usersKey) as Set
  for user in pairs(users.set) do
    local newCash = tonumber(cashTable[user])
    partialState.cash[user] = newCash
  end
  send = redis.status_reply(cjson.encode(partialState))
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
