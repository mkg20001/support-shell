'use strict'

const Hapi = require('hapi')
const Joi = require('joi')

const pino = require('pino')
const log = pino({name: 'support-shell'})

const Relish = require('relish')({
  messages: {}
})

// getSessionID = AJ's rando prounauncible id mod

const fs = require('fs')
const path = require('path')

const init = async (config) => {
  const template = String(fs.readFileSync(path.join(__dirname, 'template.sh')))

  config.hapi.routes = {
    validate: {
      failAction: Relish.failAction
    }
  }

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
          const id = getSessionID()
          await router.addSession(id, request.payload)
          return 'SES_' + id
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
