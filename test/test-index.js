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

process.env.TYPETALK_CLIENT_ID = clientId
process.env.TYPETALK_CLIENT_SECRET = clientSecret
process.env.TYPETALK_ROOMS = topicId
process.env.TYPETALK_API_RATE = 1
const host = 'https://typetalk.in'

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

  describe('#Profile', () => {
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

})
