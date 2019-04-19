'use strict'

const crypto = require('crypto')
const generateID = () => { // must be: UNIQURE, URL-SAFE, PRONOUNCIBLE
  return 'placeholder-please-add-id-function'
}
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
    matchSecret: (sec) => (data.secret = sec)
  }
}

function Server (tlsOptions) {
  return new Promise((resolve, reject) => {
    let _resolve = resolve
    let _reject = reject

    const socket = new Promise((resolve, reject) => {
      const server = tls.createServer(tlsOptions, (socket) => {
        socket.setEncoding('utf8')
        resolve(socket)
        server.close(() => {})
      })
      server.once('error', _reject)

      server.listen(0, () => {
        return _resolve({port: server.address().port, socket})
      })
    })
  })
}

function Router (tlsOptions, bindAddress) {
  let clients = []

  // setInterval() // TODO: toss out dead clients every minute (check if sock open otherwise lastseen less than 1h)

  return {
    addSession: (info) => {
      clients.push(Client(info))
    },
    getClients: () => {
      clients.map(cl => {
        return {id: cl.id(), info: cl.info(), lastSeen: cl.lastSeen()}
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
    }

  }
}

module.exports = Router
