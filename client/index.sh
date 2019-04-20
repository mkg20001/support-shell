#!/bin/bash

log() {
  echo "*** $*"
}

rscreen() {
  clear
  echo
  echo "Support-Shell v0.1.0"
  echo
  if [ ! -z "$1" ]; then
    echo "== $1 =="
    echo
  fi
}

simple_menu() {
  i=-1
  l=("$@")
  if [ ! "$MUTE" ]; then
    for e in "$@"; do
      i=$(( $i + 1 ))
      echo "[$i] $e"
    done
  fi

  while true; do
    read -p "> " num

    if [ ! -z "${l[$num]}" ]; then
      OUT="${l[num]}"
      return 0
    fi
  done
}

CONFDIR="$HOME/.config/support-shell"
SERVDIR="$CONFDIR/servers"

mkdir -p "$SERVDIR"

set_rpc() {
  RHOST="$1"
  RTOKEN="$2"
}

do_rpc() {
  RES=$(curl -s -H "X-Token: $RTOKEN" "https://$RHOST/_/$1")
  verify_noerror || return $?
  echo "$RES"
}

do_rpc_post() {
  RES=$(curl -s --data "$2" -H "X-Token: $RTOKEN" "https://$RHOST/_/$1")
  verify_noerror || return $?
  echo "$RES"
}

list_servers() {
  while true; do
    rscreen "Select Server"

    SERVERS=$(dir -w 1 "$SERVDIR")
    SERVERS=($SERVERS)
    simple_menu "${SERVERS[@]}" "#add" "#del" "#quit"

    if [ "$OUT" == "#add" ]; then
      add_server
    elif [ "$OUT" == "#del" ]; then
      rscreen "Select Server -> Delete Server"
      simple_menu "${SERVERS[@]}" "#back"
      if [[ "$OUT" != "#back" ]]; then
        rm -f "$SERVDIR/$OUT"
      fi
    elif [ "$OUT" == "#quit" ]; then
      exit 0
    else
      . "$SERVDIR/$OUT"
      set_rpc "$HOST:$PORT" "$TOKEN"
      list_clients
    fi
  done
}

list_clients() {
  while true; do
    rscreen "$HOST -> Select Client"

    CLIENTS=$(do_rpc clients)
    echo "$CLIENTS" | jq -r '.[] | .id + ": " + .info.user + "@" + .info.hostname + "\n  (" + .info.kernel + ")\n"'
    CLIENT_IDS=$(echo "$CLIENTS" | jq -r '.[] | .id')
    CLIENT_IDS=($CLIENT_IDS) # split into array
    simple_menu "${CLIENT_IDS[@]}" "#refresh" "#quit" "#back"

    if [ "$OUT" == "#quit" ]; then
      exit 0
    elif [ "$OUT" == "#back" ]; then
      return 0
    elif [ "$OUT" == "#refresh" ]; then
      true
    else
      connect_client "$OUT"
    fi

  done
}

get_var() {
  VAR=$(echo "$RES" | grep "$1_" | sed "s|^$1_||g")
  if [ -z "$VAR" ]; then
    log "ERROR: Variable $VAR expected to be in response, yet wasn\'t"
    return 2
  fi
  echo "$VAR"
}

verify_noerror() {
  ex=$?

  if [ "$ex" -ne 0 ]; then
    RES="ERR_TOOL_$ex"
  fi

  ERROR=$(echo "$RES" | grep "ERR_")
  JERR=$(echo "$RES" | jq -r ".error" 2> /dev/null)

  if [ ! -z "$ERROR" ]; then
    log "ERROR: $ERROR" >&2
    return 2
  fi

  if [ ! -z "$JERR" ]; then
    log "ERROR: $JERR" >&2
    return 2
  fi
}

connect_client() {
  rscreen

  (
    log "Connecting to $1..."
    do_rpc_post client/connect "clientid=$1" > /dev/null
    CPORT=$(get_var PORT)
    socat file:`tty`,raw,echo=0 "openssl:$HOST:$CPORT"
  )

  log "Shell ended. Press return to continue..."
  read foo
}

add_server() {
  read -p "Name> " name
  read -p "Host> " host
  read -p "Port> " port
  read -p "Token> " token
  set_rpc "$host:$port" "$token"
  log "Trying to connect..."
  if do_rpc clients 2> /dev/null > /dev/null; then
    log "Success!"
    log "Saving server '$name'!"
    echo -e "HOST='$host'\nPORT='$port'\nTOKEN='$token'\n" > "$SERVDIR/$name"
  else
    log "Failed!"
  fi

  log "Press return to go back..."
  read foo
}

list_servers
