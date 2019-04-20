'use strict'

const Bcrypt = require('bcrypt')
const Boom = require('boom')

const hashCmp = {
  bcrypt: async (pw, hash) => {
    return Bcrypt.compare(pw, hash) // returns a promise
  },
  plain: async (pw, hashNotReally) => {
    return pw === hashNotReally
  }
}

module.exports = (server, {tokens, tokenHash}) => {
  return {
    authenticate: async function (request, h) {
      const token = request.headers['x-token']

      if (!token) {
        throw Boom.unauthorized()
      }

      const isValid = Boolean((await Promise.all(tokens.map((hash) => hashCmp[tokenHash](token, hash)))).filter(Boolean).length)

      if (isValid) {
        return h.authenticated({ credentials: {} })
      } else {
        throw Boom.unauthorized()
      }
    }
  }
}
