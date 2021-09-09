-- List of territories in each one's respective industry
local industryRegistry: {string: {string}} = {
  Black = {"Charlie", "Kilo", "Romeo", "Zulu"},
  Blue = {"Zero", "One"},
  Brown = {"Alpha", "Bravo"},
  Cyan = {"Delta", "Echo", "Foxtrot"},
  Green = {"Whiskey", "X-ray", "Yankee"},
  Magenta = {"Golf", "India", "Juliett"},
  Orange = {"Lima", "Mike", "November"},
  Red = {"Oscar", "Papa", "Quebec"},
  White = {"Hotel", "Uniform"},
  Yellow = {"Sierra", "Tango", "Victor"}
}
redis.setresp(3)
-- Case of submission undo
if #KEYS > 0 then

end
-- Case of normal submission
redis.call("HSET", unpack(ARGV) as (string))
