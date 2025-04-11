// server.js
const { App } = require('@slack/bolt');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const grantCommand = require('./commands/grant');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.command('/grant', grantCommand);

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('Slack bot running');
})();

const expressApp = express();
expressApp.use(bodyParser.json());

expressApp.get('/', (req, res) => res.send('Slack HCB Granter Bot'));

expressApp.listen(3001, () => console.log('Express server running'));
