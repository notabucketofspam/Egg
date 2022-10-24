-- Enable RESP3
redis.setresp(3)
-- Things to be returned from the script
local record send
  map: {string: string}
end
send.map = {}
-- Final reply
return send
