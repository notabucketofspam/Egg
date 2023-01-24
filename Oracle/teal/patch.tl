-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- List of conglomerates / stocks (products) and their initial prices / values
local hsetConglomerates = {
  "Cathy:CREAM", "0", "Cathy:BEER", "0", "Cathy:CRUNCH", "0", "Cathy:ROLL", "0",
  "Terri:TOWER", "0", "Terri:TAP", "0", "Terri:TIME", "0", "Terri:TENT", "0",
  "Gary:CALC", "0", "Gary:GUI", "0", "Gary:GLIT", "0", "Gary:GPU", "0",
  "Doug:CANN", "0", "Doug:DOOD", "0", "Doug:DUG", "0", "Doug:CLUB", "0"
}
-- Script params
local verKey = KEYS[1]
local userCount = tonumber(ARGV[1])
local gameKey = ARGV[2]
local ver = tonumber(ARGV[3])
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
  -- choose a patch; will need to externally iterate to apply more than one
  local globalVer = tonumber(redis.call("GET", "global-ver") as string)
  if ver == globalVer then
    -- already on the latest patch, so do nothing
    send = redis.status_reply("OK")
    return send
  elseif ver == 0 then
    -- add "last-own" to each user
    -- "last-own" is now the only field provided by the new toScriptKeys()
    for i = 2, userCount do
      redis.call("HSET", KEYS[i as integer], unpack(hsetConglomerates))
    end
  elseif ver == 1 then
    -- add "last-member" to each user
    -- Ends up being the exact same as above
    for i = 2, userCount do
      redis.call("HSET", KEYS[i as integer], unpack(hsetConglomerates))
    end
  elseif ver == 2 then
    -- remove "last-own" from all users
    redis.call("DEL", unpack(KEYS, 2))
  elseif ver == 3 then
    -- add "next-price" to game
    local nextPriceKey = KEYS[2]
    local priceKey = KEYS[3]
    local priceDump = redis.call("DUMP", priceKey) as string
    redis.call("RESTORE", nextPriceKey, "0", priceDump, "REPLACE")
  elseif ver == 4 then
    -- remove "second-init" from game
    redis.call("DEL", KEYS[2])
  elseif ver == 5 or ver == 7 then
    -- add "last-cash" to game
    local lastCashKey = KEYS[2]
    local cashKey = KEYS[3]
    local cashDump = redis.call("DUMP", cashKey) as string
    redis.call("RESTORE", lastCashKey, "0", cashDump, "REPLACE")
  elseif ver == 6 then
    -- add "soup" to game
    redis.call("SET", KEYS[2], "0")
  elseif ver == 8 then
    -- Terry -> Terri
    local function toTerri(key: string)
      local hash = (redis.call("HGETALL", key) as Hash).map
      local hset: {string} = {
        "Terri:TOWER", hash["Terry:TOWER"],
        "Terri:TAP", hash["Terry:TAP"],
        "Terri:TIME", hash["Terry:TIME"],
        "Terri:TENT", hash["Terry:TENT"]
      }
      redis.call("HDEL", key, "Terry:TOWER", "Terry:TAP", "Terry:TIME", "Terry:TENT")
      redis.call("HSET", key, unpack(hset))
    end
    for i = 2, #KEYS do
      toTerri(KEYS[i])
    end
  elseif ver == 9 then
    -- One membership value per conglomerate
    local lastMemberKey = KEYS[2]
    local memberKey = KEYS[3]
    local lastMember = (redis.call("HGETALL", lastMemberKey) as Hash).map
    local member = (redis.call("HGETALL", memberKey) as Hash).map
    redis.call("DEL", lastMemberKey)
    redis.call("DEL", memberKey)
    redis.call("HSET", lastMemberKey, "Cathy", lastMember["Cathy:BEER"], "Terri", lastMember["Terri:TIME"],
      "Gary", lastMember["Gary:GPU"], "Doug", lastMember["DOUG:CANN"])
    redis.call("HSET", memberKey, "Cathy", member["Cathy:BEER"], "Terri", member["Terri:TIME"],
      "Gary", member["Gary:GPU"], "Doug", member["DOUG:CANN"])
  end
  -- increment version ###
  redis.call("INCR", verKey)
  send = redis.status_reply("OK")
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
