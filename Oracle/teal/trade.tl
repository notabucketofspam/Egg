-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
-- initKey will be unused in the second window
local initKey = KEYS[1]
local priceKey = KEYS[2]
local cashKey = KEYS[3]
local roundKey = KEYS[4]
-- userFields are: cart-json, offers-json, own
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
  con: string
  com: string
  total: number
  round: number
end
local function getKey(ui: number, key: string): string 
  if key == "cart" then
    return KEYS[2 + 3*ui as integer]
  elseif key == "offers" then
    return KEYS[3 + 3*ui as integer]
  elseif key == "own" then
    return KEYS[4 + 3*ui as integer]
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
  -- The round number will be affixed to every transaction, so that
  -- stock-price.tl can sort them chronologically later on
  local round = tonumber(redis.call("HGET", roundKey, "round") as string)
  -- {username: {own: {comshort: count}}}
  local user: {string: {string: {string: number}}} = {}
  local cash: {string: number} = {}
  -- use ARGV here instead of userCount bc it's already a string
  local zusers = redis.call("ZRANGE", initKey, "0", ARGV[1], "REV") as {string}
  local allUserOwn: {string: {string: string}} = {}
  local cashMap = (redis.call("HGETALL", cashKey) as Hash).map
  local price = (redis.call("HGETALL", priceKey) as Hash).map
  for ui = 1, userCount do
    local username = zusers[ui as integer]
    allUserOwn[username] = (redis.call("HGETALL", getKey(ui, "own")) as Hash).map
    user[username] = {
      own = {}
    }
    cash[username] = tonumber(cashMap[username])
    -- Delete existing offers (in case something has gone awry);
    -- there should be no offers at the start of any phase, only at the end
    redis.call("DEL", getKey(ui, "offers"))
  end
  if phase == "3" then
    -- First trading window
    -- Start running through each user's cart
    for rxi = 1, userCount do
      -- Theoretically, rx for every item in the cart should be this user
      local rxUser = zusers[rxi as integer]
      local cart = redis.call("SMEMBERS", getKey(rxi, "cart")) as Set
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
            local newOwn = tostring(newct + tonumber(allUserOwn[rxUser][comshort]))
            allUserOwn[rxUser][comshort] = newOwn
            user[rxUser].own[comshort] = tonumber(newOwn)
            redis.call("HSET", getKey(rxi, "own"), comshort, newOwn)
            available = available - newct
            -- Cash
            local newCash = cash[rxUser] - newct*tonumber(price[comshort])
            cash[rxUser] = newCash
            redis.call("HSET", cashKey, rxUser, tostring(newCash))
            -- Prepare to record trade
            if comTotals[comshort] == nil then
              -- Company not yet in the table
              comTotals[comshort] = {
                con = item.con,
                com = item.com,
                total = newct,
                round = round
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
          redis.call("SADD", getKey(txi, "offers"), cjson.encode(item))
        end
      end
      -- User cart has been processed, so get rid of it
      redis.call("DEL", getKey(rxi, "cart"))
    end
    -- Convert comTotals into an array of JSON strings
    for _, comtotal in pairs(comTotals) do
      local trade: Trade = {
        key = "game:"..gameId..":trade:"..comtotal.con..":"..comtotal.com..":"..round,
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
      local cart = redis.call("SMEMBERS", getKey(txi, "cart")) as Set
      for itemjson in pairs(cart.set) do
        -- Items do not need "trade" keys, since these transactions are only
        -- between players, which does not activate the price mechanism
        local item = cjson.decode(itemjson) as Item
        local comshort = item.con..":"..item.com
        -- Take from sending user
        local txOwn = tonumber(allUserOwn[txUser][comshort])
        local txNewOwn = tostring(txOwn - item.ct)
        allUserOwn[txUser][comshort] = txNewOwn
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
      redis.call("DEL", getKey(txi, "cart"))
    end
  else
    -- Something has gone wrong
    send = redis.error_reply("EBADPHASE")
    return send
  end
  send = redis.status_reply(cjson.encode({list, user, cash}))
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
