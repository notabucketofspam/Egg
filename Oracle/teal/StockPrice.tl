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
redis.call("HSET", unpack(ARGV) as (string))
