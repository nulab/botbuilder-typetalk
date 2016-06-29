"use strict";
const botbuilder = require('botbuilder');
const fetch = require('node-fetch');
const Bluebird = require('bluebird');
const WebSocket = require('ws');
const events = require('events');
const FormData = require('form-data');
const Package = {
    "name": "botbuilder-typetalk",
    "version": "0.3.0",
};
class TypetalkBot extends botbuilder.DialogCollection {
    constructor(options) {
        super();
        this.options = options;
        this.localizer = options.localizer;
        this.defaultDialogId = options.defaultDialogId || '/';
        this.sessionStore = options.sessionStore || new botbuilder.MemoryStorage();
        this.userStore = options.userStore || new botbuilder.MemoryStorage();
        this.stream = new TypetalkStream(this.options);
        this.profile = { name: null, info: null };
    }
    listen() {
        this.stream.on('connected', () => {
            this.emit('connected');
        });
        this.stream.on('message', (roomId, postId, account, message) => {
            if (account.id === this.profile.info.account.id) {
                return;
            }
            const storeId = `${roomId}:${account.id}`;
            const sessionOptions = {
                dialogs: this,
                dialogId: this.defaultDialogId,
                localizer: this.localizer,
                dialogArgs: {}
            };
            const session = new botbuilder.Session(sessionOptions);
            session.on('send', (msg) => {
                if (!msg)
                    return;
                Bluebird.join(this.setSessionData(storeId, session.sessionState), this.setUserData(storeId, session.userData)).then(() => {
                    this.stream.postMessage(roomId, msg.text, postId);
                    this.emit('send', msg);
                });
            });
            session.on('error', (error) => {
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
                });
            });
            Bluebird.join(this.getSessionData(storeId), this.getUserData(storeId)).then((arg) => {
                const sessionData = arg[0];
                const userData = arg[1];
                session.userData = userData || {};
                session.userData.identity = account;
                const typetalkMessage = {
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
            this.profile['info'] = data;
            this.profile['name'] = data.account.name;
            this.stream.listen();
        })
            .catch((error) => {
            console.error(error);
        });
    }
    getUserData(accountId) {
        const options = { context: this.userStore };
        return Bluebird.promisify(this.userStore.get, options)(accountId)
            .then((userdata) => userdata || {});
    }
    setUserData(accountId, data) {
        const options = { context: this.userStore };
        return Bluebird.promisify(this.userStore.save, options)(accountId, data)
            .then(() => data);
    }
    getSessionData(accountId) {
        const options = { context: this.sessionStore };
        return Bluebird.promisify(this.sessionStore.get, options)(accountId)
            .then((userdata) => userdata);
    }
    setSessionData(accountId, data) {
        const options = { context: this.sessionStore };
        return Bluebird.promisify(this.sessionStore.save, options)(accountId, data)
            .then(() => data);
    }
}
exports.TypetalkBot = TypetalkBot;
class TypetalkStream extends events.EventEmitter {
    constructor(options) {
        super();
        this.host = 'typetalk.in';
        this.connected = false;
        if (!options.clientId || !options.clientSecret || !options.rooms) {
            console.error('Not enough parameters provided. Please set client id, client secret and rooms');
            process.exit(1);
        }
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.rooms = options.rooms.split(',');
        this.rooms.forEach((roomId) => {
            if (!(roomId.length > 0 && parseInt(roomId) > 0)) {
                console.error('Room id must be greater than 0');
                process.exit(1);
            }
        });
    }
    connect() {
        return new WebSocket(`https://${this.host}/api/v1/streaming`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'User-Agent': `${Package.name} v${Package.version}`
            }
        });
    }
    listen() {
        console.log('listen start');
        let ws = this.ws = this.connect();
        ws.on('open', () => {
            this.connected = true;
            console.log('Typetalk WebSocket connected');
            this.emit('connected');
            setInterval(() => ws.ping('ping'), 1000 * 60 * 10);
        });
        ws.on('message', (data, flags) => {
            const event = JSON.parse(data);
            if (event.type === 'postMessage') {
                const topic = event.data.topic;
                const post = event.data.post;
                if (this.rooms.indexOf(topic.id + "") >= 0) {
                    this.emit('message', topic.id, post.id, post.account, post.message);
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
    postMessage(topicId, message, replyTo) {
        const form = new FormData();
        form.append('message', message);
        if (replyTo)
            form.append('replyTo', replyTo);
        return this.requestWithToken('POST', `/api/v1/topics/${topicId}`, null, null, form)
            .catch((error) => {
            console.error(error);
        });
    }
    getMyProfile() {
        return this.requestWithToken('GET', '/api/v1/profile');
    }
    updatetAccessToken() {
        return new Promise((resolve, reject) => {
            this.getAccessToken()
                .then((data) => {
                this.accessToken = data.access_token;
                this.refreshToken = data.refresh_token;
                resolve();
            });
        });
    }
    getAccessToken() {
        const form = new FormData();
        form.append('client_id', this.clientId);
        form.append('client_secret', this.clientSecret);
        form.append('grant_type', 'client_credentials');
        form.append('scope', 'my,topic.read,topic.post');
        return this.request('POST', '/oauth2/access_token', null, null, form);
    }
    requestWithToken(method, path, headers, query, body) {
        headers = headers || {};
        const req = () => {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
            return this.request(method, path, headers, query, body)
                .catch((error) => {
                if (error.response.status === 401) {
                    return this.updatetAccessToken();
                }
                else {
                    throw error;
                }
            });
        };
        if (!this.accessToken) {
            return this.updatetAccessToken().then(req);
        }
        else {
            return req();
        }
    }
    request(method, path, headers, query, body) {
        headers = headers || {};
        return this.fetching(method, path, headers, query, body)
            .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                return response;
            }
            else {
                const error = new TypetalkError(response.statusText);
                error.response = response;
                throw error;
            }
        })
            .then((response) => {
            return response.json();
        });
    }
    fetching(method, path, headers, query, body) {
        headers['User-Agent'] = `${Package.name} v${Package.version}`;
        const options = {
            method: method,
            headers: headers
        };
        if (method != 'GET') {
            options.body = body;
        }
        const url = `https://${this.host}${path}${this.toQueryString(query)}`;
        return fetch(url, options);
    }
    toQueryString(obj) {
        const queryString = [];
        for (const prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                queryString.push(`${prop}=${obj[prop]}`);
            }
        }
        return queryString.length > 0 ? `?${queryString.join('&')}` : '';
    }
}
