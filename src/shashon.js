'use strict'

// SHASHON: JSON for shell, really hacky

/*

Functionality:
 - replace error responses with ERR_$NAME
 - convert objects into $KEY_$VAL (so the result can later be grepped-out of the response)
  - example: {"ses": "banana"} -> SES_BANANA

*/

const parseError = (error) => {
  return error.details.map((i) => {
    let err = {
      key: i.context.key,
      path: i.path.join('.'),
      message: i.message.replace(/"/g, ''),
      type: i.type.split('.').shift(),
      constraint: i.type.split('.').pop()
    }

    // if label is different than key, provide label
    if (i.context.label !== err.key) {
      err.label = i.context.label
    }

    return err
  })
}

const formatResponse = (error, source, errorMessage) => {
  errorMessage = 'ERR_VALIDATION_' + source + '_' + errorMessage
  error.output.payload = errorMessage.replace(/[ ,]/g, '_').replace(/[^A-Za-z0-9_]/g, '').replace(/[a-z]/g, _ => _.toUpperCase())

  return error
}

module.exports = {
  convert (obj) {
    let out = ''
    for (const key in obj) { // eslint-disable-line guard-for-in
      out += key.toUpperCase() + '_' + obj[key] + '\n'
    }

    return out
  },
  errorHandler (request, h, err) {
    // parse error object
    const errors = parseError(err)

    // build main error message
    const errorMessage = errors.map((e) => e.message).join(', ')

    // retrieve validation failure source
    const source = err.output.payload.validation.source

    // format error response
    err = formatResponse(err, source, errorMessage)

    return err
  }
}
