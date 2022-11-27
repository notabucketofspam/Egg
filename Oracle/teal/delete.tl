-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local indexKey = KEYS[1]
-- The rest of the keys need not be mentioned, because they're all getting deleted anyways
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
  -- Delete game
  redis.call("SREM", "games", gameId)
  redis.call("FT.DROPINDEX", indexKey, "DD")
  redis.call("DEL", unpack(KEYS, 2))
  send = redis.status_reply("OK")
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
