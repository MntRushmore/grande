const { findOrCreateUser } = require('../api/hcb');

module.exports = function registerLoginCommand(app) {
  app.command('/login', async ({ command, ack, client }) => {
    // Check if user is already authenticated
  
    const slackRes = await client.users.info({ user: command.user_id });
    const email = slackRes.user.profile.email;
    const user = await findOrCreateUser(email);
    if (user.access_token) {
      await ack({
        response_type: 'ephemeral',
        text: '✅ You are already authenticated! You can now use all commands.',
      });
      return;
    }
    await ack({
      text: 'Click the button below to authenticate your account:',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Ready to link your account? 👇'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Login to HCB x Airtable'
              },
              url: 'https://hcb-airtable.hackclub.dev/login',
              action_id: 'login_button'
            }
          ]
        }
      ]
    });
  });
};