-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local usersKey = KEYS[1]
local debugKey = KEYS[2]
local userCount = tonumber(ARGV[1])
local gameId = ARGV[2]
local username = ARGV[3]
-- A field of State (i.e. cash, ver, ready, etc.), including user[username] sub-fields
local fieldname = ARGV[4]
-- property of a State field (i.e. field in a hash field-value pair, set member)
local prop = ARGV[5]
-- value of said property (i.e. value in a hash field-value pair, set operator, string value)
local value = ARGV[6]
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
  -- Check that user exists in game, but only if the key refers to a user sub-field
  if userCount == 1 then
    local users = redis.call("SMEMBERS", usersKey) as Set
    local userExists = false
    for user in pairs(users.set) do
      if user == username then
        userExists = true
        break
      end
    end
    if not userExists then
      send = redis.error_reply("ENOUSER")
      return send
    end
  end
  -- Check that key exists
  local keyExists = redis.call("EXISTS", debugKey) as number
  if keyExists == 1 then
    local partial: {string: any} = {}
    partial["cmd"] = "update"
    -- Check key type
    local keyType = (redis.call("TYPE", debugKey) as Status).ok
    -- These work regardless of if key is a user sub-field or not
    if keyType == "hash" then
      -- Assign value to hash field
      redis.call("HSET", debugKey, prop, value)
      -- Check if this is a user sub-field
      if userCount == 1 then
        -- Although the user sub-field have mixed types of Record<string, number> and
        -- string[], only the former is being accessed in this case
        local userTable: {string: {string: {string: number}}} = {}
        userTable[username] = {}
        userTable[username][fieldname] = {}
        userTable[username][fieldname][prop] = tonumber(value)
        partial["user"] = userTable
      else
        -- All record-like fields of State only have type Record<string, number>,
        -- so no need to check if value is a string or a number
        local propTable: {string: number} = {}
        propTable[prop] = tonumber(value)
        partial[fieldname] = propTable
      end
      send = redis.status_reply(cjson.encode(partial))
    elseif keyType == "string" then
      -- Assign string value
      -- prop is ignored here, since strings don't have sub-fields like hash / set
      redis.call("SET", debugKey, value)
      -- Don't check userCount, since no user sub-fields have type string
      partial[fieldname] = value
      send = redis.status_reply(cjson.encode(partial))
    elseif keyType == "set" then
      -- Add / remove set member, or delete set entirely
      if value == "sadd" then
        redis.call("SADD", debugKey, prop)
      elseif value == "srem" then
        redis.call("SREM", debugKey, prop)
      elseif value == "del" then
        -- Mostly useful for fields like ready, offers, etc.
        redis.call("DEL", debugKey)
      else
        -- value is malformed, so throw an error
        send = redis.error_reply("EBADVALUE")
        return send
      end
      -- Array fields of State are strictly string[]; user[username]["offers-json"]
      -- is stored as JSON initially and parsed on the client
      local itemSet = redis.call("SMEMBERS", debugKey) as Set
      -- Check if this is a user sub-field
      if userCount == 1 then
        -- Like in the hash section above, only the string[] types in user
        -- are being accessed
        local userTable: {string: {string: {string}}} = {}
        userTable[username] = {}
        userTable[username][fieldname] = {}
        for item in pairs(itemSet.set) do
          table.insert(userTable[username][fieldname], item)
        end
        partial["user"] = userTable
      else
        local fieldTable: {string} = {}
        for item in pairs(itemSet.set) do
          table.insert(fieldTable, item)
        end
        partial[fieldname] = fieldTable
      end
      -- Special case: if the set is empty, return an empty array instead of an empty object
      local partialjson = cjson.encode(partial)
      local partialjson2 = string.gsub(partialjson, '"'..fieldname..'":{}', '"'..fieldname..'":[]')
      send = redis.status_reply(partialjson2)
    else
      -- The key is not one of the above types
      send = redis.error_reply("EBADTYPE")
    end
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
