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
    break
  end
end
if gameExists then
  local record partial
    pw: {string: number}
  end
  local pwTable = (redis.call("HGETALL", pwKey) as Hash).map
  local allUserOwn: {{string: string}} = {}
  for i = 1, userCount do
    local userOwn = (redis.call("HGETALL", KEYS[1 + i as integer]) as Hash).map
    table.insert(allUserOwn, userOwn)
  end
  for stock, flavor in pairs(pwTable) do
    -- Flavor value
    local fv = tonumber(flavor)
    -- Check bulldoze eligibility
    if fv < 4 then
      -- Change to Dog Water
      local meetsRequirement = false
      for i = 1, userCount do
        local ownership = tonumber(allUserOwn[i as integer][stock])
        if ownership >= 80 then
          meetsRequirement = true
        end
      end
      if meetsRequirement then
        redis.call("HSET", pwKey, stock, "4")
        if partial.pw == nil then
          partial.pw = {}
        end
        partial.pw[stock] = 4
      end
    elseif fv < 3 then
      -- Change to Bad
      -- Basically copy-paste from above
      local meetsRequirement = false
      for i = 1, userCount do
        local ownership = tonumber(allUserOwn[i as integer][stock])
        if ownership >= 50 then
          meetsRequirement = true
        end
      end
      if meetsRequirement then
        redis.call("HSET", pwKey, stock, "3")
        if partial.pw == nil then
          partial.pw = {}
        end
        partial.pw[stock] = 3
      end
    elseif fv < 2 then
      -- Change to Good
      -- Also basically copy-paste from above, with a little more math
      local totalOwn = 0
      local owningUsersCount = 0
      for i = 1, userCount do
        local ownership = tonumber(allUserOwn[i as integer][stock])
        totalOwn = totalOwn + ownership as integer
        if ownership > 0 then
          owningUsersCount = owningUsersCount + 1
        end
      end
      if totalOwn >= 50 and owningUsersCount >= 3 then
        redis.call("HSET", pwKey, stock, "2")
        if partial.pw == nil then
          partial.pw = {}
        end
        partial.pw[stock] = 2
      end
    elseif fv < 1 then
      -- Change to Most Excellent
      -- One last copy-paste, for good measure
      local owningUsersCount = 0
      for i = 1, userCount do
        local ownership = tonumber(allUserOwn[i as integer][stock])
        if ownership > 0 then
          owningUsersCount = owningUsersCount + 1
        end
      end
      if owningUsersCount == userCount then
        redis.call("HSET", pwKey, stock, "1")
        if partial.pw == nil then
          partial.pw = {}
        end
        partial.pw[stock] = 1
      end
    end
  end
  send = redis.status_reply(cjson.encode(partial))
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
