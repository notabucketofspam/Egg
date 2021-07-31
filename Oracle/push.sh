domain="eggonomics.net"
rsync --compress --verbose --recursive \
--include-from="rsync-include.txt" --exclude-from="rsync-exclude.txt" \
--delete -e "ssh -i \"./httpd-private-key\"" ./ httpd@$domain:/httpd/egg/
