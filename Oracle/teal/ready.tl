-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local usersKey = KEYS[1]
local readyKey = KEYS[2]
local roundKey = KEYS[3]
local cartJsonKey = KEYS[4]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local username = ARGV[3]
local isReady = ARGV[4]
local cartLength = tonumber(ARGV[5])
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameId then
    gameExists = true
    break
  end
end
if gameExists then
  -- Check that user exists in game
  local users = redis.call("SMEMBERS", usersKey) as Set
  local userExists = false
  for user in pairs(users.set) do
    if user == username then
      userExists = true
      break
    end
  end
  if userExists then
    -- Toggle ready status
    if isReady == "true" then
      redis.call("SADD", readyKey, username)
    else
      redis.call("SREM", readyKey, username)
    end
    -- Adjust cart
    if cartLength > -1 then
      redis.call("DEL", cartJsonKey)
      if cartLength > 0 then
        redis.call("SADD", cartJsonKey, unpack(ARGV, 6))
      end
    end
    -- Check what changes must be returned to the clients
    local partial = {
      ready: {string} = {},
      round: {string: number} = {},
      cmd = "update"
    }
    local usersScard = redis.call("SCARD", usersKey) as number
    local readyScard = redis.call("SCARD", readyKey) as number
    if usersScard == readyScard then
      -- All users are ready for next phase
      redis.call("DEL", readyKey)
      local phaseNext = redis.call("HINCRBY", roundKey, "phase", "1") as number
      -- Check if round counter must be increased
      if phaseNext > 5 then
        redis.call("HSET", roundKey, "phase", "0")
        partial.round["phase"] = 0
        partial.round["round"] = redis.call("HINCRBY", roundKey, "round", "1") as number
      else
        partial.round["phase"] = phaseNext
      end
    else
      -- Not ready just yet
      local ready = (redis.call("SMEMBERS", readyKey) as Set).set
      for user in pairs(ready) do
        table.insert(partial.ready, user)
      end
      -- Send the current phase in reply
      local round = (redis.call("HGETALL", roundKey) as Hash).map
      partial.round["phase"] = tonumber(round["phase"])
    end
    local partialjson = cjson.encode(partial)
    local partialjsonString = string.gsub(partialjson, '"ready":{}', '"ready":[]')
    send = redis.status_reply(partialjsonString)
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
