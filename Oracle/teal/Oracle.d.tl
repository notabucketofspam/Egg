global record redis
  call: function(...: string): any
  pcall: function(...: string): any
  error_reply: function(error_string: string): {string: string}
  status_reply: function(status_string: string): {string, string}
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
-- Needed for compatibility with Lua 5.1
global unpack = table.unpack
