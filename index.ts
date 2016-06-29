import botbuilder = require('botbuilder');
import fetch = require('node-fetch');
import Bluebird = require('bluebird');
import WebSocket = require('ws');
import events = require('events');
import FormData = require('form-data');

const Package = {
  "name": "botbuilder-typetalk",
  "version": "0.3.0",
};

export interface ITypetalkBotOptions {
  clientId: string;
  clientSecret: string;
  rooms: string;
  defaultDialogId: string;
  localizer?: botbuilder.ILocalizer;
  sessionStore?: botbuilder.IStorage;
  userStore?:  botbuilder.IStorage;
}

export class TypetalkBot extends botbuilder.DialogCollection {

  private options: ITypetalkBotOptions;
  private defaultDialogId: string;
  private localizer: botbuilder.ILocalizer;
  private sessionStore: botbuilder.IStorage;
  private userStore:  botbuilder.IStorage;
  private profile: { name: string; info: Profile; };
  private stream: TypetalkStream;

  constructor(options: ITypetalkBotOptions) {
    super();
    this.options = options;
    this.localizer = options.localizer;
    this.defaultDialogId = '/';
    this.sessionStore = options.sessionStore || new botbuilder.MemoryStorage();
    this.userStore = options.userStore || new botbuilder.MemoryStorage();
    this.stream = new TypetalkStream(this.options);
    this.profile = { name: null, info: null };
  }

  listen (): void {

    this.stream.on('connected', () => {
      this.emit('connected')
    })

    this.stream.on('message', (roomId: number, postId: number, account: Account, message: string): void => {

      if (account.id === this.profile.info.account.id) {
        return;
      }

      const storeId = `${roomId}:${account.id}`;

      const sessionOptions = <botbuilder.ISessionOptions> {
        dialogs: <botbuilder.DialogCollection> this,
        dialogId: this.defaultDialogId,
        localizer: this.localizer,
        dialogArgs: <any>{}
      };

      const session = new botbuilder.Session(sessionOptions);

      session.on('send', (msg: any) => {
        if (!msg) return
        Bluebird.join(
          this.setSessionData(storeId, session.sessionState),
          this.setUserData(storeId, session.userData)
        ).then(() => {
          this.stream.postMessage(roomId, msg.text, postId)
          this.emit('send', msg)
        })
      })

      session.on('error', (error: Error) => {
        this.emit('error', error, {
          roomId: roomId,
          postId: postId,
          account: account,
          text: message
        });
      });

      session.on('quit', () => {
        this.emit('quit', {
          roomId: roomId,
          postId: postId,
          account: account,
          text: message
        })
      })

      Bluebird.join(
        this.getSessionData(storeId),
        this.getUserData(storeId)
      ).then((arg) => {
        const sessionData = arg[0];
        const userData = arg[1];
        session.userData = userData || {};
        session.userData.identity = account;
        const typetalkMessage = <TypetalkMessage> {
          roomId: roomId,
          postId: postId,
          account: account,
          text: message,
          from: { channelId: 'typetalk' }
        };
        session.dispatch(sessionData, typetalkMessage);
      });

    });

    this.stream.getMyProfile()
      .then((data) => {
        this.profile['info'] = data
        this.profile['name'] = data.account.name
        this.stream.listen();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  private getUserData(accountId: string): Bluebird<any> {
    const options: Bluebird.PromisifyOptions = { context: this.userStore };
    return Bluebird.promisify<any, string>(this.userStore.get, options)(accountId)
      .then((userdata) => userdata || {});
  }

  private setUserData(accountId: string, data: any): Bluebird<any> {
    const options: Bluebird.PromisifyOptions = { context: this.userStore };
    return Bluebird.promisify<void, string, any>(this.userStore.save, options)(accountId, data)
      .then(() => data);
  }

  private getSessionData(accountId: string): Bluebird<any> {
    const options: Bluebird.PromisifyOptions = { context: this.sessionStore };
    return Bluebird.promisify<any, string>(this.sessionStore.get, options)(accountId)
      .then((userdata) => userdata);
  }

  private setSessionData(accountId: string, data: any): Bluebird<any> {
    const options: Bluebird.PromisifyOptions = { context: this.sessionStore };
    return Bluebird.promisify<void, string, any>(this.sessionStore.save, options)(accountId, data)
      .then(() => data);
  }
}

class TypetalkStream extends events.EventEmitter {

  private host: string = 'typetalk.in';
  private connected: boolean = false;
  private clientId: string;
  private clientSecret: string;
  private rooms: string[];
  private ws: WebSocket;
  private accessToken: string;
  private refreshToken: string;

  constructor(options: ITypetalkBotOptions) {
    super();
    if (!options.clientId || !options.clientSecret || !options.rooms) {
      console.error(
        'Not enough parameters provided. Please set client id, client secret and rooms');
      process.exit(1);
    }
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.rooms = options.rooms.split(',');
    this.rooms.forEach((roomId) => {
      if (!(roomId.length > 0 && parseInt(roomId) > 0)) {
        console.error('Room id must be greater than 0')
        process.exit(1)
      }
    })
  }

  connect(): WebSocket {
    return new WebSocket(`https://${this.host}/api/v1/streaming`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'User-Agent': `${Package.name} v${Package.version}`
      }
    })
  }

  listen(): void {
    console.log('listen start');

    let ws = this.ws = this.connect();
    ws.on('open', () => {
      this.connected = true;
      console.log('Typetalk WebSocket connected');
      this.emit('connected');
      setInterval(() => ws.ping('ping'), 1000 * 60 * 10);
    })

    ws.on('message', (data, flags) => {
      const event = JSON.parse(data);
      if (event.type === 'postMessage') {
        const topic = event.data.topic;
        const post = event.data.post;
        if (this.rooms.indexOf(topic.id + "") >= 0) {
          this.emit('message',
            topic.id,
            post.id,
            post.account,
            post.message
          )
        }
      }
    });

    ws.on('error', (event) => {
      console.error(`Typetalk WebSocket error: ${event}`);
      if (!this.connected) {
        setTimeout(() => this.listen(), 30000);
      }
    });

    ws.on('pong', (data, flags) => console.error('pong'));

    ws.on('close', (code, message) => {
      this.connected = false;
      console.error(`Typetalk WebSocket disconnected: code=${code}, message=${message}`);
      console.error('Typetalk WebSocket try to reconnect');
      setTimeout(() => this.listen(), 30000);
    });

  }

  postMessage(topicId: number, message: string, replyTo: number): Promise<_fetch.Response> {
    const form = new FormData();
    form.append('message', message);
    if (replyTo) form.append('replyTo', replyTo);
    return this.requestWithToken('POST', `/api/v1/topics/${topicId}`, null, null, form)
      .catch((error) => {
        console.error(error);
      });
  }

  getMyProfile(): Promise<Profile>  {
    return this.requestWithToken('GET', '/api/v1/profile');
  }

  updatetAccessToken(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getAccessToken()
        .then((data) => {
          this.accessToken = data.access_token;
          this.refreshToken = data.refresh_token;
          resolve();
        })
    });
  }

  getAccessToken(): Promise<{ access_token: string, refresh_token: string}> {
    const form = new FormData();
    form.append('client_id', this.clientId)
    form.append('client_secret', this.clientSecret)
    form.append('grant_type', 'client_credentials')
    form.append('scope', 'my,topic.read,topic.post')
    return this.request('POST', '/oauth2/access_token', null, null, form)
  }

  requestWithToken<T>(
    method: string,
    path: string,
    headers?: _fetch.HeaderInit,
    query?: {},
    body?: _fetch.BodyInit
  ): Promise<T> {
    headers = headers || <_fetch.HeaderInit> {};
    const req = () => {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
      return this.request(method, path, headers, query, body)
        .catch((error) => {
          if (error.response.status === 401) {
            return this.updatetAccessToken();
          } else {
            throw error;
          }
        });
    }
    if (!this.accessToken) {
      return this.updatetAccessToken().then(req);
    } else {
      return req();
    }
  }

  request<T>(
    method: string,
    path: string,
    headers?: _fetch.HeaderInit,
    query?: {},
    body?: _fetch.BodyInit
  ): Promise<T> {
    headers = headers || <_fetch.HeaderInit> {};
    return this.fetching(method, path, headers, query, body)
      .then((response) => {
        if (response.status >= 200 && response.status < 300) {
          return response;
        } else {
          const error = new TypetalkError(response.statusText);
          error.response = response;
          throw error;
        }
      })
      .then((response) => {
        return response.json();
      })
  }

  fetching(
    method: string,
    path: string,
    headers: _fetch.HeaderInit,
    query?: {},
    body?: _fetch.BodyInit
  ): Promise<_fetch.Response> {
    headers['User-Agent'] = `${Package.name} v${Package.version}`
    const options: _fetch.RequestInit = {
      method: method,
      headers: headers
    };
    if (method != 'GET') {
      options.body = body
    }
    const url = `https://${this.host}${path}${this.toQueryString(query)}`;
    return fetch(url, options);
  }

  toQueryString(obj: {}): string {
    const queryString: string[] = [];
    for (const prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        queryString.push(`${prop}=${obj[prop]}`);
      }
    }
    return queryString.length > 0 ? `?${queryString.join('&')}` : '';
  }

}

declare class Profile {
  account: Account;
}

declare class Account {
  id: number;
  name: string;
  fullName: string;
  suggestion: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

declare class TypetalkMessage implements botbuilder.IMessage {
  roomId: number;
  postId: number;
  account: Account;
}

declare class TypetalkError extends Error {
  response: _fetch.Response;
}
