-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- List of conglomerates / stocks (products) and their initial prices / values
local hsetConglomerates = {
  "Cathy:CREAM", "0", "Cathy:BEER", "0", "Cathy:CRUNCH", "0", "Cathy:ROLL", "0",
  "Terry:TOWER", "0", "Terry:TAP", "0", "Terry:TIME", "0", "Terry:TENT", "0",
  "Gary:CALC", "0", "Gary:GUI", "0", "Gary:GLIT", "0", "Gary:GPU", "0",
  "Doug:CANN", "0", "Doug:DOOD", "0", "Doug:DUG", "0", "Doug:CLUB", "0"
}
local hsetConglomeratesPrice = {
  "Cathy:CREAM", "135", "Cathy:BEER", "135", "Cathy:CRUNCH", "135", "Cathy:ROLL", "135",
  "Terry:TOWER", "135", "Terry:TAP", "135", "Terry:TIME", "135", "Terry:TENT", "135",
  "Gary:CALC", "135", "Gary:GUI", "135", "Gary:GLIT", "135", "Gary:GPU", "135",
  "Doug:CANN", "135", "Doug:DOOD", "135", "Doug:DUG", "135", "Doug:CLUB", "135"
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
  end
end
if gameExists then
  -- choose a patch; will need to externally iterate to apply more than one
  if ver == 0 then
    -- add "last-own" to each user
    -- "last-own" is now the only field provided by the new toScriptKeys()
    for i = 2, userCount do
      redis.call("HSET", KEYS[i as integer], unpack(hsetConglomerates))
    end
    -- increase version ###
    redis.call("INCR", verKey)
  elseif ver == 1 then
    -- add "last-member" to each user
    -- Ends up being the exact same as above
    for i = 2, userCount do
      redis.call("HSET", KEYS[i as integer], unpack(hsetConglomerates))
    end
    -- increase version ###
    redis.call("INCR", verKey)
  elseif ver == 2 then
    -- remove "last-own" from all users
    redis.call("DEL", unpack(KEYS, 2))
    -- increase version ###
    redis.call("INCR", verKey)
  elseif ver == 3 then
    -- add "next-price" to game
    redis.call("HSET", KEYS[2], unpack(hsetConglomeratesPrice))
    -- increase version ###
    redis.call("INCR", verKey)
  else
    -- already on the latest patch, so do nothing
  end
  send = redis.status_reply("OK")
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
