# support-shell

User:
```sh
(curl -s https://$host || wget -qO- https://$host) | sudo /bin/sh -
```

Server: responds with shell script that detects available tools, aquires a session and connects a shell to it

User:
Detect download tool:
 - `wget -qO- $URL`
 - `curl $URL`
 - `echo -e "GET $PATH HTTP/1.1\r\n" | openssl s_client -connect $HOST:443`
