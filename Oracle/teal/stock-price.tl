-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: {string: string}
-- Script params
local priceKey = KEYS[1]
local nextPriceKey = KEYS[2]
local deltaKey = KEYS[3]
-- Remaining keys refer to trades
local userCount = tonumber(ARGV[1])
local gameKey = ARGV[2]
local phase = ARGV[3]
-- Remaining args are trade JSON strings
-- Check that game exists
local games = redis.call("SMEMBERS", "games") as Set
local gameExists = false
for game in pairs(games.set) do
  if game == gameKey then
    gameExists = true
    break
  end
end
if gameExists then
  local partial = {
    price: {string: number} = {},
    delta: {string: number} = {}
  }
  if phase == "3" then
    -- Record trades and calculate next-price
  elseif phase == "4" then
    -- Apply next-price to current price and generate delta
  else
    -- Something has gone wrong
    send = redis.error_reply("EBADPHASE")
    return send
  end
  send = redis.status_reply(cjson.encode(partial))
else
  -- No game in games set
  send = redis.error_reply("ENOGAME")
end
-- Final reply
return send
