-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local pwKey = KEYS[1]
-- The only user sub-field is "own"
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
  local partial = {
    pw: {string: number} = {}
  }
  local pwTable = (redis.call("HGETALL", pwKey) as Map).map as {string: string}
  -- "repeat until true" with "do break end" is a jank way of implementing
  -- "continue" in a Lua for loop 
  for stock, flavor in pairs(pwTable) do repeat
    -- Check bulldoze eligibility
    if tonumber(flavor) < 4 then
      -- Change to Dog Water
      local meetsRequirement = false
      for i = 1, userCount do
        local userOwn = (redis.call("HGETALL", KEYS[1 + i as integer]) as Map).map as {string: string}
        if tonumber(userOwn[stock]) >= 80 then
          meetsRequirement = true
        end
      end
      if meetsRequirement then
        redis.call("HSET", pwKey, stock, "4")
        partial.pw[stock] = 4
      end
      do break end
    elseif tonumber(flavor) < 3 then
      -- Change to Bad
      -- Basically copy-paste from above
      local meetsRequirement = false
      for i = 1, userCount do
        local userOwn = (redis.call("HGETALL", KEYS[1 + i as integer]) as Map).map as {string: string}
        if tonumber(userOwn[stock]) >= 50 then
          meetsRequirement = true
        end
      end
      if meetsRequirement then
        redis.call("HSET", pwKey, stock, "3")
        partial.pw[stock] = 3
      end
      do break end
    elseif tonumber(flavor) < 2 then
      -- Change to Good
      -- Also basically copy-paste from above, with a little more math
      local totalOwn = 0
      local owningUsersCount = 0
      for i = 1, userCount do
        local userOwn = (redis.call("HGETALL", KEYS[1 + i as integer]) as Map).map as {string: string}
        totalOwn = totalOwn + tonumber(userOwn[stock]) as integer
        if tonumber(userOwn[stock]) > 0 then
          owningUsersCount = owningUsersCount + 1
        end
      end
      if totalOwn >= 50 and owningUsersCount >= 3 then
        redis.call("HSET", pwKey, stock, "2")
        partial.pw[stock] = 2
      end
      do break end
    elseif tonumber(flavor) < 1 then
      -- Change to Most Excellent
      -- One last copy-paste, for good measure
      local owningUsersCount = 0
      for i = 1, userCount do
        local userOwn = (redis.call("HGETALL", KEYS[1 + i as integer]) as Map).map as {string: string}
        if tonumber(userOwn[stock]) > 0 then
          owningUsersCount = owningUsersCount + 1
        end
      end
      if owningUsersCount == userCount then
        redis.call("HSET", pwKey, stock, "1")
        partial.pw[stock] = 1
      end
      do break end
    end
  until true end
  send = redis.status_reply(cjson.encode(partial))
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
