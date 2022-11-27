-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
local gameKey = ARGV[1]
local username = ARGV[2]
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameKey then
    gameExists = true
  end
end
if gameExists then
  -- Check that user exists in game
  local users = redis.call("SMEMBERS", "game:"..gameKey..":users") as Set
  local userExists = false
  for user in pairs(users.set) do
    if user == username then
      userExists = true
    end
  end
  if userExists then
    -- Remove user
    redis.call("DEL", "game:"..gameKey..":user:"..username..":own", "game:"..gameKey..":user:"..username..":member",
      "game:"..gameKey..":user:"..username..":offers", "game:"..gameKey..":user:"..username..":last-own",
      "game:"..gameKey..":user:"..username..":last-member")
    redis.call("SREM", "game:"..gameKey..":users", username)
    redis.call("SREM", "game:"..gameKey..":ready", username)
    redis.call("HDEL", "game:"..gameKey..":pledge", username)
    redis.call("SREM", "game:"..gameKey..":can-trade", username)
    redis.call("HDEL", "game:"..gameKey..":pa", username)
    redis.call("HDEL", "game:"..gameKey..":cash", username)
    redis.call("ZREM", "game:"..gameKey..":init", username)
    redis.call("ZREM", "game:"..gameKey..":second-init", username)
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
