-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local usersKey = KEYS[1]
local readyKey = KEYS[2]
local pledgeKey = KEYS[3]
local canTradeKey = KEYS[4]
local paKey = KEYS[5]
local cashKey = KEYS[6]
local initKey = KEYS[7]
local secondInitKey = KEYS[8]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local username = ARGV[3]
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameId then
    gameExists = true
  end
end
if gameExists then
  -- Check that user exists in game
  local users = redis.call("SMEMBERS", "game:"..gameId..":users") as Set
  local userExists = false
  for user in pairs(users.set) do
    if user == username then
      userExists = true
    end
  end
  if userExists then
    -- Remove user
    redis.call("SREM", usersKey, username)
    redis.call("SREM", readyKey, username)
    redis.call("HDEL", pledgeKey, username)
    redis.call("SREM", canTradeKey, username)
    redis.call("HDEL", paKey, username)
    redis.call("HDEL", cashKey, username)
    redis.call("ZREM", initKey, username)
    redis.call("ZREM", secondInitKey, username)
    redis.call("DEL", unpack(KEYS, 9))
    send = redis.status_reply("OK")
  else
    -- No user in game
    send = redis.error_reply("ENOUSER")
  end
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
