global record redis
  call: function(...: string)
  pcall: function(...: string)
  error_reply: function(error_string: string)
  status_reply: function(status_string: string)
  setresp: function(resp: number)
  breakpoint: function()
  debug: function(...: any)
  sha1hex: function(input: string)
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
-- Needed for compatibility with Lua 5.1
global unpack: function(list: {any}, i: number, j: number): any...
