const { WebClient } = require('@slack/web-api');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const client = new WebClient(process.env.SLACK_BOT_TOKEN, { fetch });

module.exports = async ({ ack, body }) => {
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
};