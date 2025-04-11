const { App, ExpressReceiver } = require('@slack/bolt');

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

app.command('/grant', require('../../../commands/grant'));

receiver.router.post('/api/slack/events', receiver.app);

module.exports = receiver.app;