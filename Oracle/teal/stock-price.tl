-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local priceKey = KEYS[1]
local nextPriceKey = KEYS[2]
local deltaKey = KEYS[3]
local pwKey = KEYS[4]
local indexKey = KEYS[5]
local lastTimeKey = KEYS[6]
-- Remaining keys refer to trades
local userCount = tonumber(ARGV[1])
local gameKey = ARGV[2]
local phase = ARGV[3]
local startKeys = tonumber(ARGV[4]) as integer
local unused = ARGV[5]
local unused2 = ARGV[6]
-- Remaining args are trade JSON strings
local record Trade
  time: number
  con: string
  com: string
  total: number
end
-- Transform a list of one type into another type
local function map<T, V>(list: {T}, fn: function(T, integer): (V)): {V}
  local newlist: {V} = {}
  for i = 1 as integer, #list do
    newlist[i] = fn(list[i], i)
  end
  return newlist
end
-- Get conglomerate from stock name
local function getCon(stock: string): string
  return string.match(stock, "([^:]*)")
end
-- Same as above, but for the company
local function getCom(stock: string): string
  local com = string.gsub(stock, "([^:]*):", "")
  return com
end
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameKey then
    gameExists = true
    break
  end
end
if gameExists then
  local price = (redis.call("HGETALL", priceKey) as Hash).map
  local delta = (redis.call("HGETALL", deltaKey) as Hash).map
  local pw = (redis.call("HGETALL", pwKey) as Hash).map
  -- Can start at 0 because PW flavor 1 (Most Excellent) has the same value (0)
  -- as PW flavor 0 (no PW)
  local flavor = {0.0, 0.15, 0.2, 0.25}
  if phase == "3" then
    -- Record trades and calculate next-price
    --
    -- Get time of day (time pauses inside of a Lua script); need this to compare
    -- against other times later for price mech
    local timeString = (redis.call("TIME") as {string})[1]
    local time = tonumber(timeString)
    -- Replace next-price on the off-chance that price has changed in the middle
    -- of the round (i.e. from debugging)
    local priceDump = redis.call("DUMP", priceKey) as string
    redis.call("RESTORE", nextPriceKey, "0", priceDump, "REPLACE")
    -- Insert all trades into KeyDB first
    for i = startKeys, #ARGV do
      local tradeKey = KEYS[i]
      local trade = cjson.decode(ARGV[i]) as Trade
      redis.call("HSET", tradeKey, "con", trade.con, "com", trade.com,
        "total", tostring(trade.total), "time", timeString)
    end
    -- Get results first so that searches don't have to be re-run each loop
    local search: {string: {string}} = {
      Cathy = redis.call("FT.SEARCH", indexKey, "@con:{Cathy}", "SORTBY", "time", "DESC", "NOCONTENT") as {string},
      Terri = redis.call("FT.SEARCH", indexKey, "@con:{Terri}", "SORTBY", "time", "DESC", "NOCONTENT") as {string},
      Gary = redis.call("FT.SEARCH", indexKey, "@con:{Gary}", "SORTBY", "time", "DESC", "NOCONTENT") as {string},
      Doug = redis.call("FT.SEARCH", indexKey, "@con:{Doug}", "SORTBY", "time", "DESC", "NOCONTENT") as {string},
    }
    -- Parse search results into trade objects
    local results: {string: {Trade}} = {}
    local pwmult: {string: number} = {}
    local lastTime = redis.call("INCRBY", lastTimeKey, "0") as integer
    for con, list in pairs(search) do
      table.remove(list, 1)
      results[con] = map(list, function(itemkey: string): Trade
        local item = (redis.call("HGETALL", itemkey) as Hash).map
        return {
          time = tonumber(item.time),
          con = item.con,
          com = item.com,
          total = tonumber(item.total)
        }
      end)
      -- Sort results by time, newest first
      table.sort(results[con], function(a: Trade, b: Trade): (boolean)
        return a.time > b.time
      end)
      -- Also, calculate PW price volatility multiplier
      local pwsum = 0.0
      for stock, fv in pairs(pw) do
        local fvn = tonumber(fv) as integer
        if fvn > 0 and getCon(stock) == con then
          pwsum = pwsum + flavor[fvn]
        end
      end
      pwmult[con] = (pwsum + 1)*1.3
    end
    -- Process trades with applied mathematics
    for stock in pairs(price) do
      -- Get deltas
      local con = getCon(stock)
      local com = getCom(stock)
      local con_delta = 0.0
      local com_delta = 0.0
      local con_lastdelta = 0.0
      local com_lastdelta = 0.0
      for iii = 1, #results[con] do
        local otherTrade = results[con][iii]
        if otherTrade.time == time then
          -- Deltas for this turn
          con_delta = con_delta + otherTrade.total
          if otherTrade.com == com then
            com_delta = otherTrade.total
          end
        elseif otherTrade.time == lastTime then
          -- Deltas for last turn
          con_lastdelta = con_lastdelta + otherTrade.total
          if otherTrade.com == com then
            com_lastdelta = otherTrade.total
          end
        end
      end
      -- Some kind of weighted average idk
      local deltamult = (6*com_delta + con_delta + 6*com_lastdelta + con_lastdelta)/2000
      -- Apply volatility mult. to this weighted average (or whatever it is...)
      local finalmult = pwmult[con]*deltamult + 1
      -- Finally, apply to the current price
      local newprice = tonumber(price[stock])*finalmult
      redis.call("HSET", nextPriceKey, stock, tostring(newprice))
    end
    -- Reset last-time to the current time
    redis.call("SET", lastTimeKey, timeString)
    -- Return value isn't used in this phase
    send = redis.status_reply("OK")
  elseif phase == "4" then
    -- Apply next-price to current price and generate delta
    local nextPriceDump = redis.call("DUMP", nextPriceKey) as string
    redis.call("RESTORE", priceKey, "0", nextPriceDump, "REPLACE")
    local nextPrice = (redis.call("HGETALL", nextPriceKey) as Hash).map
    local newprice: {string: number} = {}
    local newdelta: {string: number} = {}
    for stock, value in pairs(nextPrice) do
      newprice[stock] = tonumber(value)
      newdelta[stock] = newprice[stock] - tonumber(price[stock])
      redis.call("HSET", deltaKey, stock, tostring(newdelta[stock]))
    end
    send = redis.status_reply(cjson.encode({price = newprice, delta = newdelta}))
  else
    -- Something has gone wrong
    send = redis.error_reply("EBADPHASE")
  end
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
