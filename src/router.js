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
    info: () => data.info
  }
}

function Server (tlsOptions, client) {
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

  setInterval()

  return {
    addSession: (info) => {
      clients.push(Client(info))
    },
    getClients: () => {
      clients.map(cl => {
        return {id: cl.id(), info: cl.info(), lastSeen: cl.lastSeen()}
      })
    }

  }
}

module.exports = Router
