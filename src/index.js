'use strict'

const Hapi = require('hapi')
const Joi = require('joi')

const pino = require('pino')
const log = pino({name: 'support-shell'})

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

const getRealIP = (request) => {
  const xFF = request.headers['x-forwarded-for']
  const xRIP = request.headers['x-real-ip']
  return xRIP || (xFF ? xFF.split(',')[0] : request.info.remoteAddress)
}

const init = async (config) => {
  const template = String(fs.readFileSync(path.join(__dirname, 'template.sh'))).replace(/\$_HOST/g, config.router.externalHost).replace(/\$_JHOST/g, config.router.externalHost.split(':')[0])
  const tlsOptions = generateTLSOptions(config)

  config.hapi.routes = {
    validate: {
      failAction: shashon.errorHandler
    }
  }
  config.hapi.tls = tlsOptions

  const router = Router(tlsOptions, config.router.bindAddress)

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
        return h.response(template).type('content-type', 'text/x-shellscript')
      }
    }
  })

  server.route({
    method: 'POST',
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
          request.payload.ip = getRealIP(request)
          return shashon.convert(router.addSession(request.payload))
        } catch (e) {
          log.error(e)
          return 'ERR_INTERNAL'
        }
      }
    }
  })

  server.route({
    method: 'POST',
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
          log.error(e)
          return 'ERR_INTERNAL'
        }
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/_/clients',
    config: {
      // auth: {}, // TODO: add
      handler: async (request, h) => {
        return router.getClients()
      }
    }
  })

  await server.start()
}

module.exports = init
