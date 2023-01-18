-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
-- initKey will be unused in the second window
local initKey = KEYS[1]
local priceKey = KEYS[2]
local cashKey = KEYS[3]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local phase = ARGV[3]
local record Item
  id: string
  tx: string | nil
  rx: string
  con: string
  com: string
  ct: number
end
local record Trade
  key: string
  json: string
end
local record ComTotal
  id: string
  con: string
  com: string
  total: number
end
-- Return value user fields
local record UserFields
  own: {string: number}
  ["offers-json"]: {string}
end
-- User fields are: cart-json, offers-json, own
local function getKey(ui: number, key: string): string 
  if key == "cart-json" then
    return KEYS[1 + 3*ui as integer]
  elseif key == "offers-json" then
    return KEYS[2 + 3*ui as integer]
  elseif key == "own" then
    return KEYS[3 + 3*ui as integer]
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
  -- Sorted array of Trade objects; each object has Redis key and JSON string.
  -- This will only be relevant for the first trading window.
  local list: {Trade} = {}
  -- Each company will have all of its transactions summed to get a single delta
  -- for the round
  local comTotals: {string: ComTotal} = {}
  local user: {string: UserFields} = {}
  local cash: {string: number} = {}
  -- use ARGV here instead of userCount bc it's already a string
  local zusers = redis.call("ZRANGE", initKey, "0", ARGV[1]) as {string}
  local allUserOwn: {string: {string: string}} = {}
  local cashMap = (redis.call("HGETALL", cashKey) as Hash).map
  local price = (redis.call("HGETALL", priceKey) as Hash).map
  for ui = 1, userCount do
    local username = zusers[ui as integer]
    allUserOwn[username] = (redis.call("HGETALL", getKey(ui, "own")) as Hash).map
    cash[username] = tonumber(cashMap[username])
    -- Delete existing offers (in case something has gone awry);
    -- there should be no offers at the start of any phase, only at the end
    redis.call("DEL", getKey(ui, "offers-json"))
    -- Add empty offers to return value; alerts client that "offers-json" is now empty,
    -- but it may get filled later, depending on the phase
    if user[username] == nil then
      user[username] = {}
    end
    if user[username]["offers-json"] == nil then
      user[username]["offers-json"] = {}
    end
  end
  if phase == "3" then
    -- First trading window
    -- Start running through each user's cart
    for rxi = 1, userCount do
      -- Theoretically, rx for every item in the cart should be this user
      local rxUser = zusers[rxi as integer]
      local cart = redis.call("SMEMBERS", getKey(rxi, "cart-json")) as Set
      for itemjson in pairs(cart.set) do
        local item = cjson.decode(itemjson) as Item
        local comshort = item.con..":"..item.com
        if item.tx == nil then
          -- No user, so take from available
          local available = 100 as number
          for _, userOwn in pairs(allUserOwn) do
            available = available - tonumber(userOwn[comshort])
          end
          if available > 0 then
            -- Ownership
            local newct = math.min(available, item.ct)
            local newOwn = newct + tonumber(allUserOwn[rxUser][comshort])
            local newOwnStr = tostring(newOwn)
            allUserOwn[rxUser][comshort] = newOwnStr
            if user[rxUser] == nil then
              user[rxUser] = {}
            end
            if user[rxUser]["own"] == nil then
              user[rxUser]["own"] = {}
            end
            user[rxUser].own[comshort] = newOwn
            redis.call("HSET", getKey(rxi, "own"), comshort, newOwnStr)
            available = available - newct
            -- Cash
            local newCash = cash[rxUser] - newct*tonumber(price[comshort])
            cash[rxUser] = newCash
            redis.call("HSET", cashKey, rxUser, tostring(newCash))
            -- Prepare to record trade
            if comTotals[comshort] == nil then
              -- Company not yet in the table
              comTotals[comshort] = {
                id = item.id,
                con = item.con,
                com = item.com,
                total = newct
              }
            else
              -- Company is in the table
              comTotals[comshort].total = comTotals[comshort].total + newct
            end
          end
        else
          -- Send offer to other user
          local txi: number
          for i = 1, #zusers do
            if zusers[i] == item.tx then
              txi = i
              break
            end
          end
          local txUser = zusers[txi as integer]
          item.ct = math.min(tonumber(allUserOwn[txUser][comshort]), item.ct)
          local itemjson2 = cjson.encode(item)
          redis.call("SADD", getKey(txi, "offers-json"), itemjson2)
          -- Include new offers in return value
          if user[txUser] == nil then
            user[txUser] = {}
          end
          if user[txUser]["offers-json"] == nil then
            user[txUser]["offers-json"] = {}
          end
          table.insert(user[txUser]["offers-json"], itemjson2)
        end
      end
      -- User cart has been processed, so get rid of it
      redis.call("DEL", getKey(rxi, "cart-json"))
    end
    -- Convert comTotals into an array of JSON strings
    for _, comtotal in pairs(comTotals) do
      local trade: Trade = {
        key = "game:"..gameId..":trade:"..comtotal.id,
        json = cjson.encode(comtotal)
      }
      table.insert(list, trade)
    end
  elseif phase == "4" then
    -- Second trading window
    -- Run through each user's cart (again)
    for txi = 1, userCount do
      -- Like above, tx for every item in the cart should be this user
      local txUser = zusers[txi as integer]
      local cart = redis.call("SMEMBERS", getKey(txi, "cart-json")) as Set
      for itemjson in pairs(cart.set) do
        -- Items do not need "trade" keys, since these transactions are only
        -- between players, which does not activate the price mechanism
        local item = cjson.decode(itemjson) as Item
        local comshort = item.con..":"..item.com
        -- Take from sending user
        local txOwn = tonumber(allUserOwn[txUser][comshort])
        local txNewOwn = tostring(txOwn - item.ct)
        allUserOwn[txUser][comshort] = txNewOwn
        if user[txUser] == nil then
          user[txUser] = {}
        end
        if user[txUser].own == nil then
          user[txUser].own = {}
        end
        user[txUser].own[comshort] = txOwn - item.ct
        redis.call("HSET", getKey(txi, "own"), comshort, txNewOwn)
        -- Give to receiving user
        local rxi: number
        for i = 1, #zusers do
          if zusers[i] == item.rx then
            rxi = i
            break
          end
        end
        local rxUser = zusers[rxi as integer]
        local rxOwn = tonumber(allUserOwn[rxUser][comshort])
        local rxNewOwn = tostring(rxOwn + item.ct)
        allUserOwn[rxUser][comshort] = rxNewOwn
        if user[rxUser] == nil then
          user[rxUser] = {}
        end
        if user[rxUser].own == nil then
          user[rxUser].own = {}
        end
        user[rxUser].own[comshort] = rxOwn + item.ct
        redis.call("HSET", getKey(rxi, "own"), comshort, rxNewOwn)
        -- Handle cash
        local txNewCash = cash[txUser] + item.ct*tonumber(price[comshort])
        cash[txUser] = txNewCash
        local rxNewCash = cash[rxUser] - item.ct*tonumber(price[comshort])
        cash[rxUser] = rxNewCash
        redis.call("HSET", cashKey, rxUser, tostring(rxNewCash), txUser, tostring(txNewCash))
      end
      -- User cart has been processed (again), so get rid of it (again)
      redis.call("DEL", getKey(txi, "cart-json"))
    end
  else
    -- Something has gone wrong
    send = redis.error_reply("EBADPHASE")
    return send
  end
  local record partial
    list: {Trade}
    cash: {string: number}
    user: {string: UserFields}
  end
  partial.list = list
  if next(cash) ~= nil then
    partial["cash"] = cash
  end
  if next(user) ~= nil then
    partial["user"] = user
  end
  local partialjson = cjson.encode(partial)
  local partialjson2 = string.gsub(partialjson, '"list":{}', '"list":[]')
  local partialjson3 = string.gsub(partialjson2, '"offers(-)json":{}', '"offers-json":[]')
  send = redis.status_reply(partialjson3)
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
