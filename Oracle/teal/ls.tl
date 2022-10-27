-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: Map = {}
send.map = {}
-- Get list of games
local games = redis.call("SMEMBERS", "games") as Set
-- FIX not indexed correctly
for game in pairs(games.set) do
  send.map[game] = {}
  local users = redis.call("SMEMBERS", "game:" .. game .. ":users") as Set
  for user in pairs(users.set) do
    table.insert(send.map[game] as {string}, user)
  end
end
-- Final reply
return send
