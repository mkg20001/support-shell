'use strict'

function Client (id, info) {
  let data = {
    lastSeen: Date.now(),
    info,
    id
  }

  return {
    seen: () => (data.lastSeen = Date.now()),
    lastSeen: () => data.lastSeen,
    id: () => data.id,
    info: () => data.info
  }
}

function Router (tlsOptions, bindAddress) {
  let clients = []

  setInterval()

  return {
    addSession: (id, info) => {
      clients.push(Client(id, info))
    },
    getClients: () => {
      clients.map(cl => {
        return {id: cl.id(), info: cl.info(), lastSeen: cl.lastSeen()}
      })
    }
  }
}
