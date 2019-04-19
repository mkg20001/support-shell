# support-shell

User:
```sh
(curl -s https://$host || wget -qO- https://$host) | sudo /bin/sh -
```

Server: responds with shell script that detects available tools, aquires a session and connects a shell to it

User:
- Detect download tool:
  - `curl $URL`
  - `wget -qO- $URL`
  - `echo -e "GET $PATH HTTP/1.1\r\n" | openssl s_client -connect $HOST:443`
- Detect post tool:
  - `curl --post=$DATA $URL`
  - `wget --post-data=$DATA -qO- $URL`
  - `echo -e "GET $PATH HTTP/1.1\r\n" | openssl s_client -connect $HOST:443`

- Post to `aquire-session`
  - Send hostname, kernel, user
  - Get back either `ERR_$SOMETHING` or `SES_$ID` and `SEC_$SECRET`

- while !$error:
  - Post to `aquire-port`
    - Send secret
    - Get `PORT_$PORT`

  - Connect to `$PORT` via TLS and stream a shell
