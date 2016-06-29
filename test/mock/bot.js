"use strict";
const index_1 = require('../../index');
const WebSocket = require('ws');
class BotMock extends index_1.TypetalkBot {
    constructor(options) {
        super(options);
        this.stream.connect = function () {
            return new WebSocket('http://localhost:8080');
        };
    }
}
exports.BotMock = BotMock;
