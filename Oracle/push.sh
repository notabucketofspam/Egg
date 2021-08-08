#!/bin/sh
domain="eggonomics.net"
npm run build --silent
rsync --compress --recursive \
--include-from="rsync-include.txt" --exclude-from="rsync-exclude.txt" \
--delete -e "ssh -i \"./httpd-private-key\"" ./ httpd@$domain:/httpd/egg/
ssh -i "./httpd-private-key" httpd@$domain "cd /httpd/egg && npm run restart --silent"
echo && echo "Done"
