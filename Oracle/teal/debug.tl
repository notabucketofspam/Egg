-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string} = {}
-- Script params
local key = KEYS[1]
local userCount = tonumber(ARGV[1])
local gameKey = ARGV[2]
local value = ARGV[3]
local sadd = tonumber(ARGV[4])
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameKey then
    gameExists = true
  end
end
if gameExists then
  -- Check that key exists
  local keyExists = redis.call("EXISTS", key) as number
  if keyExists == 1 then
    -- Check key type
    local keyType = redis.call("TYPE", key) as string
    if keyType == "hash" then
      -- Set hash fields
      redis.call("HSET", key, value)
    elseif keyType == "string" then
      -- Set string value
      redis.call("SET", key, value)
    elseif keyType == "set" then
      -- Do something with the set, idk
      if sadd == 1 then
        redis.call("SADD", key, value)
      else
        redis.call("SREM", key, value)
      end
    end
    send = redis.status_reply("OK")
  else
    -- Key does not exist
    send = redis.error_reply("ENOKEY")
  end
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
