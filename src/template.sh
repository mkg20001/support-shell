#!/bin/sh

#                                   _            _          _ _
#  ___ _   _ _ __  _ __   ___  _ __| |_      ___| |__   ___| | |
# / __| | | | '_ \| '_ \ / _ \| '__| __|____/ __| '_ \ / _ \ | |
# \__ \ |_| | |_) | |_) | (_) | |  | ||_____\__ \ | | |  __/ | |
# |___/\__,_| .__/| .__/ \___/|_|   \__|    |___/_| |_|\___|_|_|
#           |_|   |_|
#
# This is https://github.com/mkg20001/support-shell
# A reverse-shell for quicksupport-style support
#
# To connect to it run
# $ curl https://$_HOST | sh -
#












## ** paths **

curl=$(which curl)
wget=$(which wget)
openssl=$(which openssl)
socat=$(which socat)

## ** basic **

log() {
  echo "*** $*"
}

## ** http-functions **

# TODO: test openssl method

post_results() { # TODO: try all tools after onenaother
  if [ -x "$curl" ]; then
    RES=$("$curl" -s --data "$2" "https://$_HOST/_/$1")
  elif [ -x "$wget" ]; then
    RES=$("$wget" --post-data "$2" -qO- "https://$_HOST/_/$1")
  elif [ -x "$openssl" ]; then
    RES=$(echo -e "User-Agent: openssl-simple\r\nPOST /_/$1 HTTP/1.1\r\n$2\r\n" | openssl s_client -connect "$_HOST")
  else
    RES="ERR_NO_TOOL_FOUND"
  fi
  verify_noerror
}

get_data() {
  if [ -x "$curl" ]; then
    RES=$("$curl" -s "https://$_HOST/_/$1")
  elif [ -x "$wget" ]; then
    RES=$("$wget" -qO- "https://$_HOST/_/$1")
  elif [ -x "$openssl" ]; then
    RES=$(echo -e "User-Agent: openssl-simple\r\GET /_/$1 HTTP/1.1\r\n" | openssl s_client -connect "$_HOST")
  else
    RES="ERR_NO_TOOL_FOUND"
  fi
  verify_noerror
}

verify_noerror() {
  ex=$?

  if [ "$ex" -ne 0 ]; then
    RES="ERR_TOOL_$ex"
  fi

  ERROR=$(echo "$RES" | grep "ERR_")

  if [ ! -z "$ERROR" ]; then
    log "ERROR: $ERROR"
    exit 2
  fi
}

get_var() {
  VAR=$(echo "$RES" | grep "$1_" | sed "s|^$1_||g")
  if [ -z "$VAR" ]; then
    log "ERROR: Variable $VAR expected to be in response, yet wasn\'t"
    exit 2
  fi
  echo "$VAR"
}

## ** url-functions **

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

## ** code **

open_shell() {
  # http://www.dest-unreach.org/socat/doc/socat-openssltunnel.html
  socat exec:'bash -li',pty,stderr,setsid,sigint,sane "openssl:$_JHOST:$PORT"
  # wget -q https://github.com/andrew-d/static-binaries/raw/master/binaries/linux/x86_64/socat -O /tmp/socat; chmod +x /tmp/socat
}

main() {
  echo "This software will allow a third-party unrestricted access to your computer."
  echo "You should only continue if you"
  echo " 1) Trust the individual who gave you the instruction"
  echo " 2) Understand that further execution of this script gives that individual"
  echo "    the abbility to read, modify or delete anything on your machine"
  echo ""
  log "Press Ctrl+C to cancel..."

  log "Establishing a session..."

  HOSTNAME=$(hostname)
  USER=$(whoami)
  KERNEL=$(uname -a)

  DATA="hostname=$(echo "$HOSTNAME" | urlencodepipe)&user=$(echo "$USER" | urlencodepipe)&kernel=$(echo "$KERNEL" | urlencodepipe)"

  post_results "aquire-session" "$DATA"

  SESSION_ID=$(get_var SES)
  SESSION_SECRET=$(get_var SEC)

  echo
  echo "================================================"
  echo "The session your client was assigned:"
  echo "SESSION $SESSION_ID"
  echo "================================================"
  echo

  while true; do
    log "Communicating with server..."
    post_results "aquire-port" "secret=$(echo "$SESSION_SECRET" | urlencodepipe)"
    PORT=$(get_var PORT)

    log "Opening a shell and waiting until it closes..."
    open_shell "$PORT"

    log "Shell ended. Re-opening..."
    log "(to close simply kill this process, close the terminal window,"
    log "or fully reboot the machine if you're really paranoid)"
  done
}

main # prevent early execution
