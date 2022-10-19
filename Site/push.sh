#!/bin/sh
_domain="eggonomics.net"
_options="h"
_print_help() {
  echo "Push compiled site to remote"
  echo "Options:"
  echo "  -h    print this message"
}
_push() {
  _buildmsg=$(ng build --progress=false --configuration=production)
  if [ $? -ne 0 ]; then
    echo "Fail"
    exit
  fi
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
echo "Done"
