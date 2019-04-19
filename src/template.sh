#!/bin/sh

curl=$(which curl)
wget=$(which wget)
openssl=$(which openssl)
socat=$(which socat)

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

urlencodepipe() {
  while IFS= read -r c; do
    case $c in [a-zA-Z0-9.~_-]) printf "$c"; continue ;; esac
    printf "$c" | od -An -tx1 | tr ' ' % | tr -d '\n'
  done <<EOF
$(fold -w1)
EOF
  echo
}

log() {
  echo "*** $*"
}

pop_a_shell_open() {
  log "Opening a shell..."

  # http://www.dest-unreach.org/socat/doc/socat-openssltunnel.html
  socat exec:'bash -li',pty,stderr,setsid,sigint,sane "openssl:$_JHOST:$PORT"
  # wget -q https://github.com/andrew-d/static-binaries/raw/master/binaries/linux/x86_64/socat -O /tmp/socat; chmod +x /tmp/socat
}

urlencode() { printf "$*" | urlencodepipe ;}

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
  post_results "aquire-port" "secret=$(echo "$SESSION_SECRET" | urlencodepipe)"
  PORT=$(get_var PORT)

  pop_a_shell_open "$PORT"
done
