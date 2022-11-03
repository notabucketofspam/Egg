-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
local gameKey = ARGV[1]
local username = ARGV[2]
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameKey then
    gameExists = true
  end
end
if gameExists then
  local users = redis.call("SMEMBERS", "game:"..gameKey..":users") as Set
  local userExists = false
  for user in pairs(users.set) do
    if user == username then
      userExists = true
    end
  end
  if userExists then
    redis.call("DEL", "game:"..gameKey..":user:"..username..":own", "game:"..gameKey..":user:"..username..":member")
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
    send = redis.error_reply("NOUSER The game provided has no such user")
  end
else
  send = redis.error_reply("NOGAME The game provided does not exist")
end
-- Final reply
return send
