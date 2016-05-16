'use strict'

const TypetalkBot = require('../../index')
const WebSocket = require('ws')

class BotMock extends TypetalkBot {

  constructor(options) {
    super(options)
    this.stream.connect = function() {
      return new WebSocket('http://localhost:8080')
    }
  }
}

module.exports = BotMock
