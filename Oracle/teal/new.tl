-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local send: Status
-- List of conglomerates / stocks (products) and their initial prices / values
local hsetConglomerates = {
  "Cathy:CREAM", "0", "Cathy:BEER", "0", "Cathy:CRUNCH", "0", "Cathy:ROLL", "0",
  "Terry:TOWER", "0", "Terry:TAP", "0", "Terry:TIME", "0", "Terry:TENT", "0",
  "Gary:CALC", "0", "Gary:GUI", "0", "Gary:GLIT", "0", "Gary:GPU", "0",
  "Doug:CANN", "0", "Doug:DOOD", "0", "Doug:DUG", "0", "Doug:CLUB", "0"
}
local hsetConglomeratesPrice = {
  "Cathy:CREAM", "135", "Cathy:BEER", "135", "Cathy:CRUNCH", "135", "Cathy:ROLL", "135",
  "Terry:TOWER", "135", "Terry:TAP", "135", "Terry:TIME", "135", "Terry:TENT", "135",
  "Gary:CALC", "135", "Gary:GUI", "135", "Gary:GLIT", "135", "Gary:GPU", "135",
  "Doug:CANN", "135", "Doug:DOOD", "135", "Doug:DUG", "135", "Doug:CLUB", "135"
}
-- Add game data
local gameKey = ARGV[1]
redis.call("SADD", "games", gameKey)
redis.call("FT.CREATE", "game:"..gameKey..":index", "PREFIX", "1", "game:"..gameKey..":trade:",
  "SCHEMA", "con", "TAG", "CASESENSITIVE")
redis.call("HSET", "game:"..gameKey..":price", unpack(hsetConglomeratesPrice))
redis.call("HSET", "game:"..gameKey..":delta", unpack(hsetConglomerates))
redis.call("HSET", "game:"..gameKey..":pw", unpack(hsetConglomerates))
redis.call("HSET", "game:"..gameKey..":round", "round", "0", "phase", "0")
-- Final reply
send = redis.status_reply("OK")
return send
