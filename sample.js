'use strict'

require('dotenv').config()

const TypetalkBot = require('./index')
const builder = require('botbuilder')

const bot = new TypetalkBot({
  clientId: process.env.HUBOT_TYPETALK_CLIENT_ID,
  clientSecret: process.env.HUBOT_TYPETALK_CLIENT_SECRET,
  rooms: process.env.HUBOT_TYPETALK_ROOMS
})

const dialog = new builder.CommandDialog()

dialog.matches('Nice to meet you', function(session) {
  if (!session.userData.name) {
    session.send('Nice to meet you too.')
    session.beginDialog('/profile/name')
  } else if (!session.userData.hobby) {
    session.beginDialog('/profile/hobby')
  } else if (!session.userData.food) {
    session.beginDialog('/profile/food')
  } else {
    session.send(`Your name is ${session.userData.name}. Your hobby is ${session.userData.hobby}. Your favorite food is ${session.userData.food}. `)
    session.send('I remembered!')
  }
})

bot.add('/profile/name', [
  (session) => {
    builder.Prompts.text(session, 'What is your name?')
  },
  (session, results) => {
    session.userData.name = results.response
    session.endDialog()
  }
])

bot.add('/profile/hobby', [
  (session) => {
    builder.Prompts.text(session, 'What is your hobby?')
  },
  (session, results) => {
    session.userData.hobby = results.response
    session.endDialog()
  }
])

bot.add('/profile/food', [
  (session) => {
    builder.Prompts.text(session, 'What is your favorite food?')
  },
  (session, results) => {
    session.userData.food = results.response
    session.endDialog()
  }
])

bot.add('/', dialog)
bot.listen()
