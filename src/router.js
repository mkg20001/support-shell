'use strict'

const crypto = require('crypto')
const generateID = require('human-readable-ids').hri.random
const tls = require('tls')

function Client (info) {
  let data = {
    lastSeen: Date.now(),
    info,
    id: generateID(),
    secret: crypto.randomBytes(16).toString('hex')
  }

  return {
    seen: () => (data.lastSeen = Date.now()),
    lastSeen: () => data.lastSeen,
    id: () => data.id,
    info: () => data.info,
    secret: () => data.secret,
    matchSecret: (sec) => (data.secret === sec)
  }
}

function Server (tlsOptions) { // TODO: cleanup dangling sockets
  return new Promise((resolve, reject) => {
    let _resolve = resolve
    let _reject = reject

    const _socket = new Promise((resolve, reject) => {
      process.nextTick(() => { // resolve chaos and restabilize universe. jk, just make it so the promise is defined before returning
        const server = tls.createServer(tlsOptions, (socket) => {
          socket.setEncoding('utf8')
          resolve(socket)
          server.close(() => {})
        })
        server.once('error', _reject)

        server.listen(0, () => {
          return _resolve({port: server.address().port, socket: _socket})
        })
      })
    })
  })
}

function Router (tlsOptions, bindAddress) {
  let clients = []

  // setInterval() // TODO: toss out dead clients every minute (check if sock open otherwise lastseen less than 1h)

  return {
    addSession: (info) => {
      const client = Client(info)

      clients.push(client)

      return {
        ses: client.id(),
        sec: client.secret()
      }
    },
    getClients: () => {
      return clients.map(cl => {
        return {id: cl.id(), info: cl.info(), lastSeen: cl.lastSeen(), isAvailable: Boolean(cl.socket)}
      })
    },
    aquirePort: async (secret) => {
      const client = clients.filter(cl => cl.matchSecret(secret))[0]

      if (!client) {
        return {err: 'INVALID_SECRET'}
      }

      const {port, socket} = await Server(tlsOptions, bindAddress)
      client.socket = socket

      return {port}
    },
    aquireSocket: async (clientId) => {
      const client = clients.filter(cl => cl.id() === clientId)[0]
      if (!client) {
        return {err: 'INVALID_ID'}
      }

      const clientSocket = client.socket

      if (!clientSocket) {
        return {err: 'CLIENT_SOCKET_INUSE_OR_DISCONNECTED'}
      }

      delete client.socket
      const {port, socket: accessSocket} = await Server(tlsOptions, bindAddress)

      process.nextTick(async () => {
        const access = await accessSocket
        const client = await clientSocket

        access.pipe(client)
        client.pipe(access)
      })

      return {port}
    }

  }
}

module.exports = Router
