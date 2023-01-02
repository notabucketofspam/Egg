-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local usersKey = KEYS[1]
-- initKey may refer to either init or second-init, depending on phase
local initKey = KEYS[2]
local priceKey = KEYS[3]
local nextPriceKey = KEYS[4]
local deltaKey = KEYS[5]
-- userFields are: own, offers-json
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local phase = ARGV[3]
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameId then
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
