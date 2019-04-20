#!/bin/bash

simple_menu() {
  i=0
  l=$("$@")
  for e in "$@"; do
    i=$(( $i + 1 ))
    echo "[$i] $e"
  done

  read -p "> " num

  if [ ! -z "${l[$num]}" ]; then
    OUT="${l[num]}"
  else
    simple_menu "$@"
  fi
}

# socat file:`tty`,raw,echo=0 openssl:$host:$port

CONFDIR="$HOME/.config/support-shell"
SERVDIR="$CONFDIR/servers"

mkdir -p "$SERVDIR"

set_rpc() {
  HOST="$1"
  TOKEN="$2"
}

do_rpc() {
  curl -H "X-Token: $TOKEN" "https://$HOST/_/$1"
}

list_servers() {
  SERVERS=$(dir -w 1 "$SERVDIR")
  SERVERS=("$SERVERS")
  simple_menu "${SERVERS[@]}" "+"

  if [ "$OUT" == "+" ]; then
    add_server
  fi

}

add_server() {

}
