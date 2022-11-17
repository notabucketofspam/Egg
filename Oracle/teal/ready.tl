-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string} = {}
local gameKey = ARGV[1]
local username = ARGV[2]
local isReady = ARGV[3]
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
    -- Toggle ready status
    if isReady == "true" then
      redis.call("SADD", "game:"..gameKey..":ready", username)
    else
      redis.call("SREM", "game:"..gameKey..":ready", username)
    end
    -- Check what changes must be returned to the clients
    -- local frame: {string: any} = {}
    local record frame
      ready: {string}
      round: {string: number}
    end
    frame.ready = {}
    local usersScard = redis.call("SCARD", "game:"..gameKey..":users") as number
    local readyScard = redis.call("SCARD", "game:"..gameKey..":ready") as number
    if usersScard == readyScard then
      -- All users are ready for next phase
      redis.call("DEL", "game:"..gameKey..":ready")
      frame.round = {}
      local phaseNext = redis.call("HINCRBY", "game:"..gameKey..":round", "phase", "1") as number
      -- Check if round counter must be increased
      if phaseNext > 5 then
        redis.call("HSET", "game:"..gameKey..":round", "phase", "0")
        frame.round["phase"] = 0
        frame.round["round"] = redis.call("HINCRBY", "game:"..gameKey..":round", "round", "1") as number
      else
        frame.round["phase"] = phaseNext
      end
    else
      -- Not ready just yet
      local readySet = redis.call("SMEMBERS", "game:"..gameKey..":ready") as Set
      for user in pairs(readySet.set) do
        table.insert(frame["ready"] as {string}, user)
      end
    end
    local framejson = cjson.encode(frame)
    send["ok"] = string.gsub(framejson, '"ready":{}', '"ready":[]')
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