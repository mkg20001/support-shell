'use strict'

// SHASHON: JSON for shell, really hacky

/*

Functionality:
 - replace error responses with ERR_$NAME
 - convert objects into $KEY_$VAL (so the result can later be grepped-out of the response)
  - example: {"ses": "banana"} -> SES_BANANA

*/

module.exports = {
  convert (obj) {
    let out = ''
    for (const key in obj) { // eslint-disable-line guard-for-in
      out += key.toUpperCase() + '_' + obj[key]
    }

    return out
  },
  errorHandler () { // TODO: add

  }
}
