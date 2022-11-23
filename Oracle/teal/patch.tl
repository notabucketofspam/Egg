-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string} = {}
-- List of conglomerates / stocks (products) and their initial prices / values
local hsetConglomerates = {
  "Cathy:CREAM", "0", "Cathy:BEER", "0", "Cathy:CRUNCH", "0", "Cathy:ROLL", "0",
  "Terry:TOWER", "0", "Terry:TAP", "0", "Terry:TIME", "0", "Terry:TENT", "0",
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
  end
end
if gameExists then
  -- choose a patch; will need to externally iterate to apply more than one
  if ver == 0 then
    -- add "last-own" to each user
    -- the order of keys for each user is: "last-own", member, offers, own
    -- the offers key may be undefined, but that doesn't change the order,
    -- because toScriptKeys() in Oracle does it as such
    for i = 2, 4*userCount, 4 do
      redis.call("HSET", KEYS[i as integer], unpack(hsetConglomerates))
    end
    -- increase version ###
    redis.call("SET", verKey, tostring(ver + 1))
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
