const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const { getOrgs, sendGrant } = require('../hcb.js');

require('dotenv').config();

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

const pendingGrants = {};
const grantCounts = {};

app.command('/grant', async ({ ack, body, client }) => {
  await ack();
  pendingGrants[body.user_id] = Date.now();

  setTimeout(async () => {
    if (pendingGrants[body.user_id]) {
      await client.chat.postMessage({
        channel: body.user_id,
        text: "⏰ Just checking in — did you forget to submit your grant?"
      });
    }
  }, 5 * 60 * 1000);

  const userInfo = await client.users.info({
    user: body.user_id
  });
  const userEmail = userInfo.user.profile.email;
  const orgs = await getOrgs(userEmail);
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
            placeholder: {
              type: 'plain_text',
              text: 'Enter the grant amount',
            },
          },
          label: { type: 'plain_text', text: 'Grant Amount ($)' },
        },
        {
          type: 'input',
          block_id: 'email_block',
          element: {
            type: 'plain_text_input',
            action_id: 'email',
          },
          label: { type: 'plain_text', text: 'Recipients Email' },
        },
        {
          type: 'input',
          block_id: 'org_block',
          element: {
            type: 'static_select',
            action_id: 'organization',
            placeholder: { type: 'plain_text', text: 'Select your organization' },
            options: 
              orgs
            ,
          },
          label: { type: 'plain_text', text: 'Organization' },
        },
      ],
    },
  });
});

app.view('grant_modal', async ({ ack, body, view, client }) => {
  await ack();
  delete pendingGrants[body.user.id];

  const values = view.state.values;
  const amount = values.amount_block.amount.value;
  const email = values.email_block.email.value;
  const organization = values.org_block.organization.selected_option.value;
  
  const userInfo = await client.users.info({
    user: body.user.id
  });
  const userEmail = userInfo.user.profile.email;
  console.log("sending grant to", email, "for", amount, "from", organization);
  await sendGrant(
    organization, 
    amount, 
    `Grant for ${email}`, 
    userEmail, 
    email
  );
  
  await client.chat.postMessage({
    channel: body.user.id,
    text: `:white_check_mark: Grant successfully sent to ${email} for $${amount}`
  });

  const gifs = [
    'https://media.giphy.com/media/l0MYB8Ory7Hqefo9a/giphy.gif',
    'https://media.giphy.com/media/xT9IgIc0lryrxvqVGM/giphy.gif',
    'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif'
  ];
  const gif = gifs[Math.floor(Math.random() * gifs.length)];
  await client.chat.postMessage({
    channel: body.user.id,
    text: `🎉 Here's a celebration gif for your grant:\n${gif}`
  });

  const userId = body.user.id;
  grantCounts[userId] = (grantCounts[userId] || 0) + 1;

  const top = Object.entries(grantCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => `<@${id}> — ${count} grants`)
    .slice(0, 3)
    .join('\n');

  await client.chat.postMessage({
    channel: body.user.id,
    text: `🏆 Leaderboard:\n${top}`
  });
});

module.exports = app;

(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack HCB Bot is running in Socket Mode');

    const startupClient = new WebClient(process.env.SLACK_BOT_TOKEN);
    await startupClient.chat.postMessage({
      channel: '#rushils-racoons',
      text: 'I am now online and or restarted! :tada:',
    });

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
