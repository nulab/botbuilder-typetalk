import { TypetalkBot } from '../../index';
import * as WebSocket from 'ws';

export class BotMock extends TypetalkBot {

  constructor(options) {
    super(options);
    (<any>this).stream.connect = function() {
      return new WebSocket('http://localhost:8080')
    }
  }
}
