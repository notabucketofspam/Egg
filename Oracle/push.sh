#!/bin/sh
_domain="eggonomics.net"
_options="hlrs"
_print_help() {
  echo "Push local project to remote"
  echo "Options:"
  echo "  -h    print this message"
  echo "  -l    reload dependencies on remote"
  echo "  -r    restart full application on remote"
  echo "  -s    restart only HTTP server on remote"
}
_push() {
  npm run build --silent
  rsync --compress --recursive \
--include-from="rsync-include.txt" --exclude-from="rsync-exclude.txt" \
--delete -e "ssh -i \"./httpd-private-key\"" ./ httpd@$_domain:/httpd/egg/
}
while getopts "$_options" _flag; do
  case "${_flag}" in
    h)_print_help
      exit;;
  esac
done
OPTIND=1
_push
while getopts "$_options" _flag; do
  case "${_flag}" in
    l)ssh -i "./httpd-private-key" httpd@$_domain \
"cd /httpd/egg && npm run reload-dependencies --silent";;
    r)ssh -i "./httpd-private-key" httpd@$_domain \
"cd /httpd/egg && npm restart --silent";;
    s)ssh -i "./httpd-private-key" httpd@$_domain \
"cd /httpd/egg && npm server-restart --silent"
      echo;;
  esac
done
echo "Done"