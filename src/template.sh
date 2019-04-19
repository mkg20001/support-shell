#!/bin/sh

curl=$(which curl)
wget=$(which wget)
openssl=$(which openssl)

# TODO: test openssl method

post_results() {
  if [ -x "$curl" ]; then
    "$curl" --data "$2" "https://$HOST/_/$1"
  elif [ -x "$wget" ]; then
    "$wget" --post-data "$2" -qO- "https://$HOST/_/$1"
  elif [ -x "$openssl" ]; then
    echo -e "User-Agent: openssl-simple\r\nPOST /_/$1 HTTP/1.1\r\n$2\r\n" | openssl s_client -connect "$HOST:443"
  fi
}

get_data() {
  if [ -x "$curl" ]; then
    "$curl" "https://$HOST/_/$1"
  elif [ -x "$wget" ]; then
    "$wget" -qO- "https://$HOST/_/$1"
  elif [ -x "$openssl" ]; then
    echo -e "User-Agent: openssl-simple\r\GET /_/$1 HTTP/1.1\r\n" | openssl s_client -connect "$HOST:443"
  fi
}

urlencodepipe() {
  while IFS= read -r c; do
    case $c in [a-zA-Z0-9.~_-]) printf "$c"; continue ;; esac
    printf "$c" | od -An -tx1 | tr ' ' % | tr -d '\n'
  done <<EOF
$(fold -w1)
EOF
  echo
}

urlencode() { printf "$*" | urlencodepipe ;}

verify_noerror() {
  ERROR=$(echo "$RES" | grep "ERR_")

  if [ ! -z "$ERROR" ]; then
    echo "ERROR: $ERROR"
    echo "Can not continue!"
    exit 2
  fi
}

get_var() {
  echo "$RES" | grep "$1_" | sed "s|^$1_||g"
}

echo "This software will allow a third-party unrestricted access to your computer."
echo "You should only continue if you"
echo " 1) Trust the individual who gave you the instruction"
echo " 2) Understand that further execution of this script gives that individual"
echo "    the abbility to read, modify or delete anything on your machine"
echo ""
echo "Press enter to continue, Ctrl+C to cancel..."

read FOO

echo "Establishing a session..."

HOSTNAME=$(hostname)
USER=$(whoami)
KERNEL=$(uname -a)

DATA="hostname=$(echo "$HOSTNAME" | urlencode)&user=$(echo "$USER" | urlencode)&kernel=$(echo "$KERNEL" | urlencode)"

RES=$(post_results "aquire-session" "$DATA")

verify_noerror
SESSION_ID=$(get_var SES)
SESSION_SECRET=$(get_var SEC)

echo "================================================"
echo "The session your client was assigned:"
echo "SESSION $SESSION_ID"
echo "================================================"

while true; do
  RES=$(post_results "aquire-port" "secret=$(echo "$SESSION_SECRET" | urlencode)")
  verify_noerror
  REMOTE_PORT=$(get_var PORT)

  pop_a_shell_open "$REMOTE_PORT"
done
