'use strict'

const Hapi = require('hapi')
const Joi = require('joi')

const pino = require('pino')
const log = pino({name: 'support-shell'})

const Relish = require('relish')({
  messages: {}
})

const Router = require('./router')
const shashon = require('./shashon')

const fs = require('fs')
const path = require('path')

const sslConfig = require('ssl-config')('modern')
const generateTLSOptions = ({tls: {cert, key}}) => {
  return {
    key: fs.readFileSync(key),
    cert: fs.readFileSync(cert),
    // ca: certificateAuthority,
    ciphers: sslConfig.ciphers,
    honorCipherOrder: true,
    secureOptions: sslConfig.minimumTLSVersion
  }
}

const init = async (config) => {
  const template = String(fs.readFileSync(path.join(__dirname, 'template.sh')))

  config.hapi.routes = {
    validate: {
      failAction: Relish.failAction
    }
  }

  const router = Router(generateTLSOptions(config), config.router.bindAddress)

  const server = Hapi.server(config.hapi)

  await server.register({
    plugin: require('hapi-pino'),
    options: {name: 'support-shell'}
  })

  if (global.SENTRY) {
    await server.register({
      plugin: require('hapi-sentry'),
      options: {client: global.SENTRY}
    })
  }

  await server.register({
    plugin: require('inert')
  })

  server.route({
    method: 'GET',
    path: '/',
    config: {
      handler: async (request, h) => {
        return template.replace(/\$HOST/, config.router.externalHost)
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/_/aquire-session',
    config: {
      validate: {
        payload: {
          hostname: Joi.string().required(),
          user: Joi.string().required(),
          kernel: Joi.string().required()
        }
      },
      handler: async (request, h) => {
        try {
          return shashon.convert(router.addSession(request.payload))
        } catch (e) {
          return 'ERR_INTERNAL'
        }
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/_/aquire-port',
    config: {
      validate: {
        payload: {
          secret: Joi.string().required()
        }
      },
      handler: async (request, h) => {
        try {
          return shashon.convert(await router.aquirePort(request.payload.secret))
        } catch (e) {
          return 'ERR_INTERNAL'
        }
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/_/clients',
    config: {
      auth: {}, // TODO: add
      handler: async (request, h) => {
        return router.getClients()
      }
    }
  })

  await server.start()
}

module.exports = init
