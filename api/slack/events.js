const { App, ExpressReceiver } = require('@slack/bolt');

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

app.command('/grant', require('../../commands/grant'));

// Export the receiver app to handle requests from Vercel
module.exports = receiver.app;