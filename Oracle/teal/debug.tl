-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string} = {}
-- Script params
local userCount = tonumber(ARGV[1])
local gameKey = ARGV[2]
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameKey then
    gameExists = true
  end
end
if gameExists then

else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send