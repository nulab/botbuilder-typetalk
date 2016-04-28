'use strict'

const botframework = require('botbuilder')
const EventEmitter = require('events')
const fetch = require('node-fetch')
const Promise = require('bluebird')
const WebSocket = require('ws')
const Package = require('./package')
const FormData = require('form-data')

class TypetalkBot extends botframework.DialogCollection {

    constructor(options) {
        super()
        this.options = options
        this.defaultDialogId = '/'
        this.sessionStore = options.sessionStore || new botframework.MemoryStorage()
        this.userStore = options.userStore || new botframework.MemoryStorage()
        this.profile = {}
    }

    listen() {
        const stream = new TypetalkStream(this.options)

        stream.on('message', (roomId, postId, account, message) => {
            if (account.id === this.profile.info.account.id) {
                this.emit('reply', {
                    roomId: roomId,
                    postId: postId,
                    account: account,
                    text: message
                })
                return true
            }

            const session = new botframework.Session({
                localizer: this.localizer,
                dialogs: this,
                dialogId: this.defaultDialogId,
                dialogArgs: {}
            })

            session.on('send', (msg) => {
                if (!msg) return
                Promise.join(
                    this.setSessionData(account.id, session.sessionState),
                    this.setUserData(account.id, session.userData)
                ).then(() => {
                    stream.postMessage(roomId, msg.text)
                    this.emit('send', msg)
                })
            })

            session.on('error', (error) => {
                this.emit('error', error, {
                    roomId: roomId,
                    postId: postId,
                    account: account,
                    text: message
                })
            })

            session.on('quit', () => {
                this.emit('quit', {
                    roomId: roomId,
                    postId: postId,
                    account: account,
                    text: message
                })
            })

            Promise.join(
                this.getSessionData(account.id),
                this.getUserData(account.id)
            ).then((arg) => {
                let sessionData = arg[0]
                let userData = arg[1]
                session.userData = userData || {}
                session.userData.identity = account
                session.dispatch(sessionData, {
                    roomId: roomId,
                    postId: postId,
                    account: account,
                    text: message
                })
            })

        })

        stream.getMyProfile()
            .then((data) => {
                this.profile['info'] = data
                this.profile['name'] = data.account.name
                stream.listen()
            })
            .catch((error) => {
                console.error(error)
            })
    }

    getUserData(accountId) {
        return Promise.promisify(this.userStore.get.bind(this.userStore))(accountId)
            .then((userdata) => userdata || {})
    }

    setUserData(accountId, data) {
        return Promise.promisify(this.userStore.save.bind(this.userStore))(accountId, data)
            .then(() => data)
    }

    getSessionData(accountId) {
        return Promise.promisify(this.sessionStore.get.bind(this.sessionStore))(accountId)
            .then((userdata) => userdata)
    }

    setSessionData(accountId, data) {
        return Promise.promisify(this.sessionStore.save.bind(this.sessionStore))(accountId, data)
            .then(() => data)
    }
}

module.exports = TypetalkBot

class TypetalkStream extends EventEmitter {

    constructor(options) {
        super()
        if (!options.clientId || !options.clientSecret || !options.rooms) {
            console.error(
                'Not enough parameters provided. Please set client id, client secret and rooms')
            process.exit(1)
        }

        this.options = options
        this.clientId = options.clientId
        this.clientSecret = options.clientSecret
        this.rooms = options.rooms.split(',')

        this.rooms.forEach((roomId) => {
            if (!(roomId.length > 0 && parseInt(roomId) > 0)) {
                console.error('Room id must be greater than 0')
                process.exit(1)
            }
        })

        this.host = 'typetalk.in'
        this.accessToken = ''
        this.refreshToken = ''
        this.connected = false
    }

    listen() {
        console.error('listen start')

        let ws = this.ws = new WebSocket(`https://${this.host}/api/v1/streaming`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'User-Agent': `${Package.name} v${Package.version}`
            }
        })

        ws.on('open', () => {
            this.connected = true
            console.error('Typetalk WebSocket connected')
                // start up a keepalive
            setInterval(() => ws.ping('ping'),
                1000 * 60 * 10)
        })

        ws.on('message', (data, flags) => {
            const event = JSON.parse(data)
            if (event.type === 'postMessage') {
                const topic = event.data.topic
                const post = event.data.post
                    // TODO update to es6 sintax
                if (this.rooms.indexOf(topic.id + "") >= 0) {
                    this.emit('message',
                        topic.id,
                        post.id,
                        post.account,
                        post.message
                    )
                }
            }
        })

        ws.on('error', (event) => {
            console.error(`Typetalk WebSocket error: ${event}`)
            if (!this.connected) {
                setTimeout(() => listen(), 30000)
            }
        })

        ws.on('pong', (data, flags) => console.error('pong'))

        ws.on('close', (code, message) => {
            this.connected = false
            console.error(`Typetalk WebSocket disconnected: code=${code}, message=${message}`)
            console.error('Typetalk WebSocket try to reconnect')
            setTimeout(() => listen(), 30000)
        })

    }

    postMessage(topicId, message) {
        const form = new FormData()
        form.append('message', message)
        return this.requestWithToken('POST', `/api/v1/topics/${topicId}`, {}, {}, form)
            .catch((error) => {
                console.error(error)
            })
    }

    getMyProfile() {
        return this.requestWithToken('GET', '/api/v1/profile', {})
    }

    updatetAccessToken() {
        return this.getAccessToken()
            .then((data) => {
                this.accessToken = data.access_token
                this.refreshToken = data.refresh_token
            })
    }

    getAccessToken() {
        const form = new FormData()
        form.append('client_id', this.clientId)
        form.append('client_secret', this.clientSecret)
        form.append('grant_type', 'client_credentials')
        form.append('scope', 'my,topic.read,topic.post')
        return this.request('POST', '/oauth2/access_token', {}, {}, form)
    }

    requestWithToken(method, path, headers, query, body) {
        const req = () => {
            headers = !headers ? {} : headers
            headers['Authorization'] = `Bearer ${this.accessToken}`
            return this.request(method, path, headers, query, body)
                .catch((error) => {
                    if (error.response.status === 401) {
                        return this.updatetAccessToken()
                    } else {
                        throw error
                    }
                })
        }
        if (!this.accessToken) {
            return this.updatetAccessToken().then(req)
        } else {
            return req()
        }
    }

    request(method, path, headers, query, body) {
        return this.fetching(method, path, headers, query, body)
            .then((response) => {
                if (response.status >= 200 && response.status < 300) {
                    return response
                } else {
                    var error = new Error(response.statusText)
                    error.response = response
                    throw error
                }
            })
            .then((response) => {
                return response.json()
            })
    }

    fetching(method, path, headers, query, body) {
        headers['User-Agent'] = `${Package.name} v${Package.version}`
        const options = {
            method: method,
            headers: headers
        }
        if (method != 'GET') {
            options['body'] = body
        }
        const url = `https://${this.host}${path}${this.toQueryString(query)}`
        return fetch(url, options)
    }

    toQueryString(obj) {
        const queryString = []
        for (const prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                queryString.push(`${prop}=${obj[prop]}`)
            }
        }
        return queryString.length > 0 ? `?${queryString.join('&')}` : ''
    }

}
