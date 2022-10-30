-- Redis global object
global record redis
  call: function(...: string): any
  pcall: function(...: string): any
  error_reply: function(error_string: string): Error
  status_reply: function(status_string: string): Status
  setresp: function(resp: number)
  breakpoint: function()
  debug: function(...: any)
  sha1hex: function(input: string): string
  enum loglevel
    "LOG_DEBUG"
    "LOG_VERBOSE"
    "LOG_NOTICE"
    "LOG_WARNING"
  end
  log: function(loglevel: loglevel, message: string)
end
global ARGV: {string}
global KEYS: {string}
-- Redis return types
global record Set
  set: {string: boolean}
end
global record Map
  map: {string: Reply}
end
global record Status
  ok: string
end
global record Error
  err: string
end
global type Reply = string | number | boolean | nil | {Reply}
-- External libraries
global record cjson
  decode: function(x: string): any
  encode: function(x: any): string
end
-- Needed for compatibility with Lua 5.1
global unpack = table.unpack
