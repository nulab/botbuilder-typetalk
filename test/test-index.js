"use strict";
const assert = require('power-assert');
const nock = require('nock');
const WebSocket = require('ws');
const Fixture = require('./fixtures');
const bot_1 = require('./mock/bot');
const Server = WebSocket.Server;
const clientId = 'deadbeef';
const clientSecret = 'deadbeef';
const topicId = '1';
const host = 'https://typetalk.in';
process.env.TYPETALK_CLIENT_ID = clientId;
process.env.TYPETALK_CLIENT_SECRET = clientSecret;
process.env.TYPETALK_ROOMS = topicId;
process.env.TYPETALK_API_RATE = 1;
var _global;
describe("main", () => {
    beforeEach(() => {
        nock(host)
            .post("/oauth2/access_token")
            .reply(200, Fixture.oauth2.access_token);
        nock(host)
            .get("/api/v1/profile")
            .reply(200, Fixture.profile.get);
        _global = {
            server: new Server({ port: 8080 }),
            bot: new bot_1.BotMock({
                clientId: process.env.TYPETALK_CLIENT_ID,
                clientSecret: process.env.TYPETALK_CLIENT_SECRET,
                rooms: process.env.TYPETALK_ROOMS
            })
        };
    });
    afterEach(() => {
        nock.cleanAll();
        _global.server.close();
    });
    describe('#listen', () => {
        it('should emmit on connected', (done) => {
            _global.bot.on('connected', done);
            _global.bot.listen();
        });
    });
    describe('#DataStore', () => {
        it('should set/get user data', (done) => {
            const accountId = 1;
            const userData = { name: 'john', age: 15, verify: true };
            _global.bot.setUserData(accountId, userData).then(() => {
                _global.bot.getUserData(accountId).then((data) => {
                    assert.deepEqual(userData, data);
                    done();
                });
            });
        });
        it('should set/get session data', (done) => {
            const accountId = 1;
            const userData = { name: 'john', age: 15, verify: true };
            _global.bot.setSessionData(accountId, userData).then(() => {
                _global.bot.getSessionData(accountId).then((data) => {
                    assert.deepEqual(userData, data);
                    done();
                });
            });
        });
    });
});
describe('TypetalkStream', () => {
    beforeEach(() => {
        nock(host)
            .post("/oauth2/access_token")
            .reply(200, Fixture.oauth2.access_token);
        _global.server = new Server({ port: 8080 });
        _global.bot = new bot_1.BotMock({
            clientId: process.env.TYPETALK_CLIENT_ID,
            clientSecret: process.env.TYPETALK_CLIENT_SECRET,
            rooms: process.env.TYPETALK_ROOMS
        });
    });
    afterEach(() => {
        nock.cleanAll();
        _global.server.close();
    });
    it('should have configs from environment variables', (done) => {
        assert(clientId === _global.bot.stream.clientId);
        assert(clientSecret === _global.bot.stream.clientSecret);
        assert(topicId == _global.bot.stream.rooms[0]);
        done();
    });
    describe('#getMyProfile', () => {
        it('should get profile', (done) => {
            nock(host)
                .get('/api/v1/profile')
                .reply(200, Fixture.profile.get);
            _global.bot.stream.getMyProfile()
                .then((data) => {
                assert.deepEqual(data, Fixture.profile.get);
                done();
            })
                .catch((error) => {
                console.error(error);
            });
        });
    });
    describe('#getAccessToken', () => {
        it('should get access token', (done) => {
            _global.bot.stream
                .getAccessToken()
                .then((data) => {
                assert.deepEqual(data, Fixture.oauth2.access_token);
                done();
            });
        });
    });
    describe('#updatetAccessToken', () => {
        it('should update access token', (done) => {
            _global.bot.stream
                .updatetAccessToken()
                .then(() => {
                assert(_global.bot.stream.accessToken === Fixture.oauth2.access_token.access_token);
                assert(_global.bot.stream.refreshToken === Fixture.oauth2.access_token.refresh_token);
                done();
            });
        });
    });
    describe('#toQueryString', () => {
        it('should to query string', (done) => {
            const queryString = _global.bot.stream.toQueryString({ id: 1, name: 'john', age: 15 });
            assert('?id=1&name=john&age=15' === queryString);
            done();
        });
    });
});
