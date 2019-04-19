#!/usr/bin/env node

/* eslint-disable no-console */

'use strict'

module.exports = (init) => {
  const yaml = require('js-yaml')
  const fs = require('fs')
  const path = require('path')

  const confPath = [path.join(process.cwd(), 'config.yaml'), '/etc/lgs/config.yaml'].filter(p => fs.existsSync(p))[0]

  const config = confPath ? yaml.load(String(fs.readFileSync(confPath))) : {
    hapi: {
      port: 5357,
      host: '::'
    },
    routing: {
      externalHost: 'localhost.mkg20001.io',
      externalPort: 443,
      bindAddress: '::'
    },
    tls: {
      cert: ''

    }
  }

  init(config).catch(e => {
    console.error('')
    console.error('A fatal error has occured! Application has been terminated!')
    console.error('')
    console.error(e.stack)
    process.exit(1) // TODO: sentry catch uncaught call
  })
}
