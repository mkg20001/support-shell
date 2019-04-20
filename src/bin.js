#!/usr/bin/env node

/* eslint-disable no-console */

'use strict'

module.exports = (init) => {
  const yaml = require('js-yaml')
  const fs = require('fs')
  const path = require('path')

  const confPath = [process.argv[2], path.join(process.cwd(), 'config.yaml'), '/etc/support-shell/config.yaml'].filter(p => fs.existsSync(p))[0]

  if (!confPath) {
    console.error('Please copy config.example.yaml into config.yaml, edit it and then run this script with the config path as first argument')
    process.exit(2)
  }

  const config = yaml.load(String(fs.readFileSync(confPath)))

  init(config).catch(e => {
    console.error('')
    console.error('A fatal error has occured! Application has been terminated!')
    console.error('')
    console.error(e.stack)
    process.exit(1) // TODO: sentry catch uncaught call
  })
}
