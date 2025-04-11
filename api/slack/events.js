const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

if (process.env.NODE_ENV === 'development') {
  console.log('🔁 Hot reload enabled (watching for file changes)');
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

if (process.env.NODE_ENV === 'development') {
  const logEvent = async ({ event }) => {
    console.log('📩 Incoming Slack event:', JSON.stringify(event, null, 2));
  };

  app.event('message', logEvent);
  app.event('app_mention', logEvent);
}

app.command('/grant', async ({ ack, body, client }) => {
  await ack();

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'grant_modal',
      title: { type: 'plain_text', text: 'Send Card Grant' },
      submit: { type: 'plain_text', text: 'Send' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '*Fill out the grant details below*' },
        },
        {
          type: 'input',
          block_id: 'amount_block',
          element: {
            type: 'plain_text_input',
            action_id: 'amount',
          },
          label: { type: 'plain_text', text: 'Amount ($)' },
        },
      ],
    },
  });
});

module.exports = app;

(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack HCB Bot is running in Socket Mode');
  } catch (error) {
    console.error('Failed to start Slack HCB Bot:', error);
    process.exit(1);
  }
})();

process.on('SIGINT', async () => {
  console.log('👋 Shutting down Slack HCB Bot (SIGINT)');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('👋 Shutting down Slack HCB Bot (SIGTERM)');
  await app.stop();
  process.exit(0);
});
