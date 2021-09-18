-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local record send
  map: {string: string}
end
send.map = {}
-- List of territories in each one's respective industry
local industryRegistry: {string: {string}} = {
  Black = {"Charlie", "Kilo", "Romeo", "Zulu"},
  Blue = {"Zero", "One"},
  Brown = {"Alpha", "Bravo"},
  Cyan = {"Delta", "Echo", "Foxtrot"},
  Green = {"Whiskey", "X-ray", "Yankee"},
  Magenta = {"Golf", "India", "Juliett"},
  Orange = {"Lima", "Mike", "November"},
  Red = {"Oscar", "Papa", "Quebec"},
  White = {"Hotel", "Uniform"},
  Yellow = {"Sierra", "Tango", "Victor"}
}
-- The table to hold last industry results
local searchResults: {any} = {}
-- Equivalent to `Command-Name` header
if ARGV[1] == "submit" then
  -- Case of normal submission
  redis.call("HSET", KEYS[1], unpack(ARGV, 2))
  local submission: {string: string} = {}
  for index = 2, #ARGV, 2 do
    submission[ARGV[index]] = ARGV[index + 1]
  end
  searchResults = redis.call("FT.SEARCH", "index:submissions", "@ind:{" .. submission["ind"] .. "}") as {any}
elseif ARGV[1] == "undo" then
  -- Case of submission undo
  local subkeyDeleted = redis.call("DEL", KEYS[1]) as number > 0
  send.map["gaffe-counter"] = subkeyDeleted and tostring(redis.call("HINCRBY", "variables", "gaffe-counter", "1"))
    or "-1"
  if not subkeyDeleted then
    send.map["err"] = "The subkey does not exist."
    return send
  end
  local submission = (redis.call("HGETALL", KEYS[1]) as {string: {string: string}})["map"]
  searchResults = redis.call("FT.SEARCH", "index:submissions", "@ind:{" .. submission["ind"] .. "}") as {any}
elseif ARGV[1] == "debug" then
  -- Case of debug
  searchResults = redis.call("FT.SEARCH", "index:submissions", "@ind:{" .. ARGV[2] .. "}") as {any}
else
  send.map["err"] = "Invalid command name."
  return send
end
-- Start of calculations
local constants = (redis.call("HGETALL", "constants") as {string: {string: string}})["map"]
-- Get all subs
local submissions: {{string: string}} = {}
for index = 2, #searchResults, 2 do
  local place = (index / 2) as integer
  submissions[place] = {}
  submissions[place]["subkey"] = searchResults[index] as string
  local sub = searchResults[index + 1] as {string}
  for subindex = 1, #sub, 2 do
    submissions[place][sub[subindex]] = sub[subindex + 1]
  end
end
-- Error if not enough subs to do calculations
local calcRange = tonumber(constants["calc-range"])
if #submissions < calcRange then
  send.map["err"] = "Not enough submissions exist in order to do calculations."
  return send
end
-- Sort subs oldest to newest
table.sort(submissions, function (a: {string: string}, b: {string: string}): boolean
  return tonumber(a["time"]) - tonumber(b["time"]) < 0
end)
-- Equivalent to old `results` array
local calcsubs: {{string: string}} = {}
for index = 1, calcRange, 1 do
  table.insert(calcsubs, table.remove(submissions))
end
-- Equivalent to old `deletables` array
local delsubs: {{string: string}} = {}
for index = 1, #submissions + calcRange - tonumber(constants["keep-range"]), 1 do
  table.insert(delsubs, table.remove(submissions, 1))
end
-- Some functions that will be useful for calculating the stock price delta
local function map<T, V>(obj: {T}, fn: function(T, integer): V): {V}
  local newobj: {V} = {}
  for index = 1, #obj, 1 do
    newobj[index] = fn(obj[index], index)
  end
  return newobj
end
local function filter<T>(obj: {T}, fn: function(T): boolean): {T}
  local newobj: {T} = {}
  for index = 1, #obj, 1 do
    if fn(obj[index]) then
      table.insert(newobj, obj[index])
    end
  end
  return newobj
end
local function reduceSum(obj: {number}): number
  local sum = 0.0
  for index = 1, #obj, 1 do
    sum = sum + obj[index]
  end
  return sum
end
-- Constants that can be safely calculated outside of the central loop below
local lastTerritory = calcsubs[#calcsubs]["terr"]
local winCount = #filter(map(calcsubs, function(sub: {string: string}): boolean
  return sub["terr"] == lastTerritory and sub["win"] == "true" or false
end), function(element: boolean): boolean
  return element
end)
local loseCount = #filter(map(calcsubs, function(sub: {string: string}): boolean
  return sub["terr"] == lastTerritory and sub["win"] == "false" or false
end), function(element: boolean): boolean
  return element
end)
local indWinCount = #filter(map(calcsubs, function(sub: {string: string}): boolean
  return sub["win"] == "true"
end), function(element: boolean): boolean
  return element
end)
local indLoseCount = #filter(map(calcsubs, function(sub: {string: string}): boolean
  return sub["win"] == "false"
end), function(element: boolean): boolean
  return element
end)
local territories = industryRegistry[calcsubs[1]["ind"]]
local indWinMult = tonumber(constants["ind-win-mult"])
local indLoseMult = tonumber(constants["ind-lose-mult"])
local winMult = tonumber(constants["win-mult"])
local loseMult = tonumber(constants["lose-mult"])
-- Stock price delta
local delta: {string: number} = {}
-- Iterate over each territory in this industry
for index = 1, #territories, 1 do
  local weightedAverageStockLoss = 0.0
  local winLoseDividend = 0.0
  if territories[index] == lastTerritory then
    local stockLossArray = filter(map(calcsubs, function(sub: {string: string}): number
      return sub["terr"] == lastTerritory and tonumber(sub["start"]) - tonumber(sub["end"]) or -1.0
    end), function(element: number): boolean
      return element ~= -1.0
    end)
    local averageStockLossArray = filter(map(calcsubs, function(sub: {string: string}): number
      return sub["terr"] == lastTerritory and (tonumber(sub["start"]) - tonumber(sub["end"])) /
        tonumber(sub["start"]) or -1.0
    end), function(element: number): boolean
      return element ~= -1.0
    end)
    local stockLossWeightArray = filter(map(calcsubs, function(sub: {string: string}): number
      return sub["terr"] == lastTerritory and reduceSum(stockLossArray) / #stockLossArray or -1.0
    end), function(element: number): boolean
      return element ~= -1.0
    end)
    weightedAverageStockLoss = reduceSum(stockLossArray) ~= 0.0 and reduceSum(map(averageStockLossArray,
      function(element: number, place: integer): number
        return element * stockLossWeightArray[place]
      end)) / reduceSum(stockLossWeightArray) or reduceSum(averageStockLossArray) / #averageStockLossArray
    weightedAverageStockLoss = weightedAverageStockLoss ~= 0.0 and weightedAverageStockLoss or
      math.pow(2, 1 - calcRange)
    winLoseDividend = math.pow(winMult, winCount) - math.pow(loseMult, loseCount)
  else
    winLoseDividend = math.pow(indWinMult, indWinCount) - math.pow(indLoseMult, indLoseCount) +
      math.pow(winMult, winCount) - math.pow(loseMult, loseCount)
  end
  delta[territories[index]] = weightedAverageStockLoss ~= 0.0 and winLoseDividend / weightedAverageStockLoss or
    winLoseDividend
end
-- Commence stock price update
local stockPrice = (redis.call("HGETALL", "stock-price") as {string: {string: string}})["map"]
local stockPriceHset: {string} = {}
for territory, value in pairs(delta) do
  table.insert(stockPriceHset, territory)
  table.insert(stockPriceHset, tostring(math.max(tonumber(stockPrice[territory]) + value,
    tonumber(constants["stock-price-floor"]))))
end
send.map["hset-reply"] = tostring(redis.call("HSET", "stock-price", unpack(stockPriceHset)))
-- Delete old submissions
if #delsubs > 0 then
  local submissionsDel = map(delsubs, function(sub: {string: string}): string
    return sub["subkey"]
  end)
  send.map["del-reply"] = tostring(redis.call("DEL", unpack(submissionsDel)))
end
-- Final reply
send.map["ok"] = "done"
return send
