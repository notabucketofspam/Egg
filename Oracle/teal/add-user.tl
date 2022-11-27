-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- List of conglomerates / stocks (products) and their initial prices / values
local hsetConglomerates = {
  "Cathy:CREAM", "0", "Cathy:BEER", "0", "Cathy:CRUNCH", "0", "Cathy:ROLL", "0",
  "Terry:TOWER", "0", "Terry:TAP", "0", "Terry:TIME", "0", "Terry:TENT", "0",
  "Gary:CALC", "0", "Gary:GUI", "0", "Gary:GLIT", "0", "Gary:GPU", "0",
  "Doug:CANN", "0", "Doug:DOOD", "0", "Doug:DUG", "0", "Doug:CLUB", "0"
}
local gameKey = ARGV[1]
local user = ARGV[2]
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameKey then
    gameExists = true
  end
end
if not gameExists then
  send = redis.error_reply("ENOGAME")
  return send
end
-- Check that user is provided
if user ~= nil then
  -- Add new user data
  redis.call("HSET", "game:"..gameKey..":user:"..user..":own", unpack(hsetConglomerates))
  redis.call("HSET", "game:"..gameKey..":user:"..user..":member", unpack(hsetConglomerates))
  redis.call("HSET", "game:"..gameKey..":user:"..user..":last-own", unpack(hsetConglomerates))
  redis.call("HSET", "game:"..gameKey..":user:"..user..":last-member", unpack(hsetConglomerates))
  redis.call("SADD", "game:"..gameKey..":users", user)
  -- redis.call("SADD", "game:"..gameKey..":ready", user)
  redis.call("HSET", "game:"..gameKey..":pledge", user, "0")
  redis.call("SADD", "game:"..gameKey..":can-trade", user)
  redis.call("HSET", "game:"..gameKey..":pa", user, "0")
  redis.call("HSET", "game:"..gameKey..":cash", user, "3000")
  redis.call("ZADD", "game:"..gameKey..":init", "0", user)
  redis.call("ZADD", "game:"..gameKey..":second-init", "0", user)
  send = redis.status_reply("OK")
else
  -- No user
  send = redis.error_reply("ENOUSERPARAM")
end
-- Final reply
return send
