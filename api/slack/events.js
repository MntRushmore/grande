const { App, SocketModeReceiver } = require('@slack/bolt');
const { ConsoleLogger } = require('@slack/logger');
const customLogger = new ConsoleLogger();
customLogger.setLevel('error');
const { WebClient } = require('@slack/web-api');
const { getOrgs, sendGrant } = require('../hcb.js');

const transactionsCommand = require('../../commands/transactions');
const orgInfoCommand = require('../../commands/orginfo');
const bankUrlCommand = require('../../commands/bank_url');
const grantsForCommand = require('../../commands/grants_for.js');
const grantCommand = require('../../commands/grant.js');
const registerLoginCommand = require('../../commands/login');

require('dotenv').config();

// Configure a Socket Mode receiver with extended ping/pong timeouts
const receiver = new SocketModeReceiver({
  appToken: process.env.SLACK_APP_TOKEN,
  pingInterval: 30000,
  pongTimeout: 20000
});


if (process.env.NODE_ENV === 'development') {
  console.log('🔁 Hot reload enabled (watching for file changes)');
  console.log('code edited');
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver,
  logger: customLogger
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
const grantTemplates = {};

app.event('message', async ({ event, client }) => {
  if (event.channel === 'rushils-racoons' && event.text && event.text.toLowerCase().includes('shut up') && !event.subtype) {
    await client.chat.postMessage({
      channel: event.channel,
      text: 'no'
    });
  }
});


app.command('/grant_template', async ({ ack, body, client }) => {
  await ack();

  const { amount, email, organization } = body.text.split(' ');

  grantTemplates[body.user_id] = {
    amount,
    email,
    organization
  };

  await client.chat.postMessage({
    channel: body.user_id,
    text: `:white_check_mark: Template created for ${email} with amount $${amount}.`
  });
});

app.command('/grant_template_delete', async ({ ack, body, client }) => {
  await ack();

  delete grantTemplates[body.user_id];

  await client.chat.postMessage({
    channel: body.user_id,
    text: `:x: Template deleted successfully.`
  });
});

app.command('/grant list_templates', async ({ ack, body, client }) => {
  await ack();

  const template = grantTemplates[body.user_id];
  const userTemplates = template
    ? `Template: ${body.user_id} - Amount: ${template.amount}, Email: ${template.email}, Organization: ${template.organization}`
    : "No templates found.";

  await client.chat.postMessage({
    channel: body.user_id,
    text: userTemplates
  });
});

app.command('/grant', async ({ ack, body, client }) => {
  await ack();
  pendingGrants[body.user_id] = Date.now();

  const userInfo = await client.users.info({
    user: body.user_id
  });
  const userEmail = userInfo.user.profile.email;
  console.log("📧 Slack user email used to fetch DB record:", userEmail);
  const orgs = await getOrgs(userEmail);
  
  if (!orgs || orgs.length === 0) {
    await client.chat.postMessage({
      channel: body.user_id,
      text: "❌ No organizations found for your email. Please make sure you're associated with an organization in Hack Club Bank."
    });
    return;
  }

  const userTemplate = grantTemplates[body.user_id];
  const userTemplates = userTemplate
    ? [
        `Amount: ${userTemplate.amount}, Email: ${userTemplate.email}, Organization: ${userTemplate.organization}`
      ]
    : [];
  
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'grant_modal',
      title: { type: 'plain_text', text: 'Send Grant' },
      submit: { type: 'plain_text', text: 'Send' },
      close: { type: 'plain_text', text: 'Cancel' },
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'Choose a template or create a new one:' },
        },
        {
          type: 'input',
          block_id: 'template_block',
          element: {
            type: 'static_select',
            action_id: 'template',
            placeholder: { type: 'plain_text', text: 'Select template' },
            options: userTemplates.length > 0
              ? [
                  {
                    text: { type: 'plain_text', text: userTemplates[0] },
                    value: userTemplates[0],
                  },
                ]
              : [
                  {
                    text: { type: 'plain_text', text: 'No templates available' },
                    value: 'none',
                  },
                ],
          },
          label: { type: 'plain_text', text: 'Template' },
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
  await ack({
    response_action: 'update',
    view: {
      type: 'modal',
      callback_id: 'confirm_grant_modal',
      title: { type: 'plain_text', text: 'Confirm Grant' },
      submit: { type: 'plain_text', text: 'Confirm' },
      close: { type: 'plain_text', text: 'Cancel' },
      private_metadata: JSON.stringify(view.state.values),
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `You're about to send *$${view.state.values.amount_block.amount.value}* to *${view.state.values.email_block.email.value}* from *${view.state.values.org_block.organization.selected_option.text.text}*.`
          }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'Are you sure you want to proceed?' }
        }
      ]
    }
  });
});

app.view('confirm_grant_modal', async ({ ack, body, view, client }) => {
  await ack();
  delete pendingGrants[body.user.id];

  const values = JSON.parse(view.private_metadata);
  const amount = values.amount_block.amount.value;
  const email = values.email_block.email.value;
  const organization = values.org_block.organization.selected_option.value;

  const userInfo = await client.users.info({
    user: body.user.id
  });
  const userEmail = userInfo.user.profile.email;
  console.log("📧 Slack user email in confirmation step:", userEmail);
  console.log("Confirmed grant to", email, "for", amount, "from", organization);

  try {
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

    // Log grant info to #granteo-logs before celebration gif
    try {
      await client.chat.postMessage({
        channel: 'C0848BEH5A4',
        text: `:money_with_wings: *Grant Sent*\n• To: ${email}\n• Amount: $${amount}\n• Org: ${organization}\n• Sent by: <@${body.user.id}>`
      });
    } catch (err) {
      console.error('❌ Logging grant failed:', err);
    }

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
  } catch (error) {
    console.error('❌ Failed to send grant:', error);

    await client.chat.postMessage({
      channel: body.user.id,
      text: `:x: Something went wrong when trying to send the grant. Please try again or ask for help.`
    });

    await client.chat.postMessage({
      channel: 'C0848BEH5A4',
      text: `:rotating_light: *Grant failed*\n• User: <@${body.user.id}>\n• Email: ${email}\n• Amount: $${amount}\n• Org: ${organization}\n• Error: \`${error.message || error}\``
    });
  }
});

const dailyLogClient = new WebClient(process.env.SLACK_BOT_TOKEN);
function scheduleDailyCheckIn() {
  const now = new Date();
  const next9am = new Date(now);
  next9am.setHours(9, 0, 0, 0);
  if (now >= next9am) {
    next9am.setDate(next9am.getDate() + 1);
  }
  const timeUntilNext9am = next9am - now;
  setTimeout(() => {
    dailyLogClient.chat.postMessage({
      channel: 'C0848BEH5A4',
      text: `🕘 Daily check-in: Granteo is still online and functioning at ${new Date().toLocaleString()}`
    });
    setInterval(() => {
      dailyLogClient.chat.postMessage({
        channel: 'C0848BEH5A4',
        text: `🕘 Daily check-in: Granteo is still online and functioning at ${new Date().toLocaleString()}`
      });
    }, 24 * 60 * 60 * 1000);
  }, timeUntilNext9am);
}
scheduleDailyCheckIn();

module.exports = app;

(async () => {
  try {
    await app.start(process.env.PORT || 3030);
    console.log('⚡️ Slack HCB Bot is running on port', process.env.PORT || 3030);
    if (process.env.NODE_ENV === 'development') {
      const startupClient = new WebClient(process.env.SLACK_BOT_TOKEN);
      await startupClient.chat.postMessage({
        channel: 'C0848BEH5A4',
        text: 'I am now online and or restarted! :tada:',
      });
      await startupClient.chat.postMessage({
        channel: 'C0848BEH5A4',
        text: ':white_check_mark: Granteo bot has started and is online.',
      });
    }
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
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await app.stop();
  process.exit(1);
});
app.command('/transactions', transactionsCommand);
app.command('/orginfo', orgInfoCommand);
app.command('/bank_url', bankUrlCommand);
app.command('/grants_for', grantsForCommand);
app.command('/grant', grantCommand);

// Register the /login command
registerLoginCommand(app);
