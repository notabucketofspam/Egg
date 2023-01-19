-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local initKey = KEYS[1]
local cashKey = KEYS[2]
local pledgeKey = KEYS[3]
local paKey = KEYS[4]
local canTradeKey = KEYS[5]
local lastCashKey = KEYS[6]
local soupKey = KEYS[7]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
-- User fields are: last-member, member
local function getKey(i: number, key: string): string 
  if key == "last-member" then
    return KEYS[6 + 2*i as integer]
  elseif key == "member" then
    return KEYS[7 + 2*i as integer]
  end
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
  local record partial
    cash: {string: number}
    pa: {string: number}
    pledge: {string: number}
    user: {string: {string: {string: number}}}
    soup: number
    ["can-trade"]: {string}
  end
  local zusers = redis.call("ZRANGE", initKey, "0", ARGV[1]) as {string}
  local cash = (redis.call("HGETALL", cashKey) as Hash).map
  local pledge = (redis.call("HGETALL", pledgeKey) as Hash).map
  local pa = (redis.call("HGETALL", paKey) as Hash).map
  local soup = redis.call("GET", soupKey) as string
  local lastCash = (redis.call("HGETALL", lastCashKey) as Hash).map
  -- 15% of total player pledges is added to good will each turn
  local pledgeMult = 0.15
  -- 10% of public account is added to good will each turn
  local paMult = 0.1
  -- 10% cash back for pledge going over the user's cash at the start of the round
  local cashBackMult = 0.1
  -- Tables for membership bonuses
  local cathyMult = {0.15, 0.2, 0.25}
  local terryMult = {1.05, 1.1, 1.2}
  local garyMult = {1.15, 1.2, 1.3}
  -- Handle pledges first, but also keep track of good will (handled later)
  local metPledge: {string: number} = {}
  local goodwill = 0.0
  local newPaTotal = 0.0
  for i = 1 as integer, #zusers do repeat
    local user = zusers[i]
    local userPledge = tonumber(pledge[user])
    -- Skip this user if they didn't pledge at all this round
    if userPledge == 0.0 then
      -- Technically, the user can't fail a $0 pledge
      redis.call("SADD", canTradeKey, user)
      do break end
    end
    local userCash = tonumber(cash[user])
    local userPa = tonumber(pa[user])
    local userLastCash = tonumber(lastCash[user])
    local lastMemberKey = getKey(i, "last-member")
    local lastMember = (redis.call("HGETALL", lastMemberKey) as Hash).map
    local memberKey = getKey(i, "member")
    local member = (redis.call("HGETALL", memberKey) as Hash).map
    local newCash = userCash
    local newPa = userPa
    local contribution = userPledge
    -- Check how much the user can technically contribute; capped at user's current cash
    if userPledge > userCash then
      contribution = userCash
    end
    -- Handle Terry (one-time match on contribution)
    local terryTier = tonumber(member["Terry:TIME"]) as integer
    local terryLastTier = tonumber(lastMember["Terry:TIME"]) as integer
    if terryTier > 0 and terryLastTier < terryTier then
      local newTerryMult = 1.0
      for ii = terryLastTier + 1, terryTier do
        newTerryMult = newTerryMult*terryMult[ii]
      end
      contribution = contribution*newTerryMult
      -- Reset last-member to current member in Redis
      local memberDump = redis.call("DUMP", memberKey) as string
      redis.call("RESTORE", lastMemberKey, "0", memberDump, "REPLACE")
      -- Update return value partial
      if partial.user == nil then
        partial.user = {}
      end
      partial.user[user] = {}
      partial.user[user]["last-member"] = {}
      for stock, tier in pairs(member) do
        partial.user[user]["last-member"][stock] = tonumber(tier)
      end
    end
    -- Handle Cathy (cash back on contribution)
    local cathyTier = tonumber(member["Cathy:BEER"]) as integer
    if cathyTier > 0 then
      newCash = newCash + contribution*cathyMult[cathyTier]
    end
    if userPledge > contribution then
      -- User did not meet pledge
      redis.call("SREM", canTradeKey, user)
      newPa = userPa + newCash
      goodwill = goodwill + newCash*pledgeMult
      newCash = 0.0
    else
      -- User met pledge
      redis.call("SADD", canTradeKey, user)
      newCash = newCash - userPledge
      newPa = userPa + contribution
      metPledge[user] = contribution
      goodwill = goodwill + contribution*pledgeMult
      if userPledge > userLastCash then
        -- Bonus cash back for pledging more than user's cash at the start of the round
        newCash = newCash + userPledge*cashBackMult
      end
    end
    -- Set values in Redis
    redis.call("HSET", cashKey, user, tostring(newCash))
    redis.call("HSET", paKey, user, tostring(newPa))
    redis.call("HSET", pledgeKey, user, "0")
    -- Update return value partial
    if partial.cash == nil then
      partial.cash = {}
    end
    partial.cash[user] = newCash
    if partial.pa == nil then
      partial.pa = {}
    end
    partial.pa[user] = newPa
    if partial.pledge == nil then
      partial.pledge = {}
    end
    partial.pledge[user] = 0
    -- Update new PA total (for good will in a sec)
    newPaTotal = newPaTotal + newPa
  until true end
  -- Add 10% of PA to good will
  goodwill = goodwill + newPaTotal*paMult
  -- Determine who wins good will
  local goodwillWinner: string
  local highestContribution = 0.0
  for user, contribution in pairs(metPledge) do
    if contribution > highestContribution then
      goodwillWinner = user
      highestContribution = contribution
    end
  end
  if goodwillWinner ~= nil then
    -- Add soup to current good will, if applicable
    goodwill = goodwill + tonumber(soup)
    redis.call("SET", soupKey, "0")
    partial.soup = 0
    -- Handle Gary (cash back on good will)
    local i = 0
    for ii, user in ipairs(zusers) do
      if user == goodwillWinner then
        i = ii
        break
      end
    end
    local memberKey = getKey(i, "member")
    local member = (redis.call("HGETALL", memberKey) as Hash).map
    local garyTier = tonumber(member["Gary:CALC"]) as integer
    if garyTier > 0 then
      goodwill = goodwill*garyMult[garyTier]
    end
    -- Handle cash
    local newCash = partial.cash[goodwillWinner] + goodwill
    redis.call("HSET", cashKey, goodwillWinner, tostring(newCash))
    partial.cash[goodwillWinner] = newCash
  else
    -- No user met their pledge
    -- Store good will in soup key until at least one user meets their pledge
    local newSoup = redis.call("INCRBYFLOAT", soupKey, tostring(goodwill)) as string
    partial.soup = tonumber(newSoup)
  end
  -- Check who can / cannot trade next round
  local canTradeSet = redis.call("SMEMBERS", canTradeKey) as Set
  local canTrade: {string} = {}
  for user in pairs(canTradeSet.set) do
    table.insert(canTrade, user)
  end
  partial["can-trade"] = canTrade
  local partialjson = cjson.encode(partial)
  local partialjson2 = string.gsub(partialjson, '"can(-)trade":{}', '"can-trade":[]')
  send = redis.status_reply(partialjson2)
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
