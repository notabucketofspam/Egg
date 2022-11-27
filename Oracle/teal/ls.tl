-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
-- KEYS is a list of Redis keys, ARGV is a list of gameId
local partial = {
  cmd = "update",
  games: {string: {string}} = {}
}
-- Get list of games
for i = 1, #KEYS do
  partial.games[ARGV[i]] = {}
  local users = redis.call("SMEMBERS", KEYS[i]) as Set
  for user in pairs(users.set) do
    table.insert(partial.games[ARGV[i]], user)
  end
end
send = redis.status_reply(cjson.encode(partial))
-- Final reply
return send
