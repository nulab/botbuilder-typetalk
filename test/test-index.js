'use strict'

const assert = require('power-assert')
const nock = require('nock')
const builder = require('botbuilder')
const TypetalkBot = require('./mock/bot')
const WebSocketServer = require('ws').Server

const Fixture = require('./fixtures')
const Url = require('url')

const clientId = 'deadbeef'
const clientSecret = 'deadbeef'
const topicId = '1'
const host = 'https://typetalk.in'

process.env.TYPETALK_CLIENT_ID = clientId
process.env.TYPETALK_CLIENT_SECRET = clientSecret
process.env.TYPETALK_ROOMS = topicId
process.env.TYPETALK_API_RATE = 1

describe("main", () => {

  if (global.mocha) {
    global.mocha.globals(['*'])
  }

  beforeEach(() => {

    nock(host)
      .post("/oauth2/access_token")
      .reply(200, Fixture.oauth2.access_token)

    nock(host)
      .get("/api/v1/profile")
      .reply(200, Fixture.profile.get)

    global.wss = new WebSocketServer({ port: 8080 })

    global.bot = new TypetalkBot({
      clientId: process.env.TYPETALK_CLIENT_ID,
      clientSecret: process.env.TYPETALK_CLIENT_SECRET,
      rooms: process.env.TYPETALK_ROOMS
    })
  })

  afterEach(() => {
    nock.cleanAll()
    wss.close()
  })

  describe('#listen', () => {
    it('should emmit on connected', (done) => {
      bot.on('connected', done)
      bot.listen()
    })
  })


  describe('#DataStore', () => {

    beforeEach(() => {
      global.accountId = 1
      global.userData = { name: 'john', age: 15, verify: true }
    })

    it('should set/get user data', (done) => {
      bot.setUserData(accountId, userData).then(() => {
        bot.getUserData(accountId).then((data) => {
          assert.deepEqual(userData, data)
          done()
        })
      })
    })

    it('should set/get session data', (done) => {
      bot.setSessionData(accountId, userData).then(() => {
        bot.getSessionData(accountId).then((data) => {
          assert.deepEqual(userData, data)
          done()
        })
      })
    })

  })

})

describe('TypetalkStream', () => {

  beforeEach(() => {
    nock(host)
      .post("/oauth2/access_token")
      .reply(200, Fixture.oauth2.access_token)
    global.wss = new WebSocketServer({ port: 8080 })
    global.bot = new TypetalkBot({
      clientId: process.env.TYPETALK_CLIENT_ID,
      clientSecret: process.env.TYPETALK_CLIENT_SECRET,
      rooms: process.env.TYPETALK_ROOMS
    })
  })

  afterEach(() => {
    nock.cleanAll()
    wss.close()
  })

  it('should have configs from environment variables', (done) => {
    assert(clientId === bot.stream.clientId)
    assert(clientSecret === bot.stream.clientSecret)
    assert(topicId == bot.stream.rooms[0])
    done()
  })

  describe('#getMyProfile', () => {
    it('should get profile', (done) => {
      nock(host)
        .get('/api/v1/profile')
        .reply(200, Fixture.profile.get)
      bot.stream.getMyProfile()
        .then((data) => {
          assert.deepEqual(data, Fixture.profile.get)
          done()
        })
        .catch((error) => {
          console.error(error)
        })
    })
  })

  describe('#getAccessToken', () => {
    it('should get access token', (done) => {
      bot.stream
        .getAccessToken()
        .then((data) => {
          assert.deepEqual(data, Fixture.oauth2.access_token)
          done()
        })
    })
  })

  describe('#updatetAccessToken', () => {
    it('should update access token', (done) => {
      bot.stream
        .updatetAccessToken()
        .then(() => {
          assert(bot.stream.accessToken === Fixture.oauth2.access_token.access_token)
          assert(bot.stream.refreshToken === Fixture.oauth2.access_token.refresh_token)
          done()
        })
    })
  })

  describe('#toQueryString', () => {
    it('should to query string', (done) => {
      const queryString = bot.stream.toQueryString({ id: 1, name: 'john', age: 15})
      assert('?id=1&name=john&age=15' === queryString)
      done()
    })
  })

})
