-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
local gameKey = ARGV[1]
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameKey then
    gameExists = true
  end
end
if gameExists then
  redis.call("SREM", "games", gameKey)
  redis.call("FT.DROPINDEX", "game:"..gameKey..":index", "DD")
  local users = redis.call("SMEMBERS", "game:"..gameKey..":users") as Set
  for user in pairs(users.set) do
    redis.call("DEL", "game:"..gameKey..":user:"..user..":own", "game:"..gameKey..":user:"..user..":member")
  end
  redis.call("DEL", "game:"..gameKey..":price", "game:"..gameKey..":delta", "game:"..gameKey..":pw",
    "game:"..gameKey..":round", "game:"..gameKey..":users", "game:"..gameKey..":ready",
    "game:"..gameKey..":pledge", "game:"..gameKey..":can-trade", "game:"..gameKey..":pa",
    "game:"..gameKey..":cash", "game:"..gameKey..":init", "game:"..gameKey..":second-init")
  send = redis.status_reply("OK")
else
  send = redis.error_reply("NOGAME The game provided does not exist")
end
-- Final reply
return send
