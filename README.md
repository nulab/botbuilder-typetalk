# botbuilder-typetalk

[![Build Status](https://travis-ci.org/nulab/botbuilder-typetalk.svg?branch=master)](https://travis-ci.org/nulab/botbuilder-typetalk)
[![Coverage Status](https://coveralls.io/repos/github/nulab/botbuilder-typetalk/badge.svg?branch=master)](https://coveralls.io/github/nulab/botbuilder-typetalk?branch=master)
[![npm version](https://badge.fury.io/js/botbuilder-typetalk.svg)](https://badge.fury.io/js/botbuilder-typetalk)

[Typetalk](https://www.typetalk.com/) bot connector for Microsoft BotBuilder.

## Get started

1. Install botbuilder-typetalk
  ``` sh
  npm install botbuilder-typetalk --save
  ```

2. Create .env file.  
  .env:
  ``` sh
  TYPETALK_CLIENT_ID='DEADBEEF'     # see http://developer.nulab-inc.com/docs/typetalk/auth#client
  TYPETALK_CLIENT_SECRET='FACEFEED'
  TYPETALK_ROOMS='2321,2684'        # comma separated
  ```

3. Initialize Typetalk Bot.  
  index.js:
  ``` javascript
  'use strict'

  require('dotenv').config()
  const TypetalkBot = require('botbuilder-typetalk').TypetalkBot

  const bot = new TypetalkBot({
    clientId: process.env.TYPETALK_CLIENT_ID,
    clientSecret: process.env.TYPETALK_CLIENT_SECRET,
    rooms: process.env.TYPETALK_ROOMS
  })

  bot.add('/', (session) => {
    session.send('Hello!')
  }

  bot.listen()
  ```

4. Run bot with typetalk adapter.
  ``` sh
  node index
  ```

## Let's try sample!

1. Get botbuilder-typetalk project.
  ``` sh
  git clone git@github.com:nulab/botbuilder-typetalk.git
  cd ./botbuilder-typetalk
  ```

2. Create .env file.
  ```sh
  TYPETALK_CLIENT_ID='DEADBEEF'     # see http://developer.nulab-inc.com/docs/typetalk/auth#client
  TYPETALK_CLIENT_SECRET='FACEFEED'
  TYPETALK_ROOMS='2321,2684'        # comma separated
  ```

3. Install dependencies.
  ```sh
  npm install
  ```

4. Run sample bot.
  ```sh
  node sample
  ```

## License

MIT License

* http://www.opensource.org/licenses/mit-license.php
