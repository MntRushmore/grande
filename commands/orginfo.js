const { getOrgInfo } = require('../api/hcb');

module.exports = function(app) {
  app.command('/orginfo', async ({ command, ack, respond }) => {
    await ack();

    const orgSlug = command.text.trim();

    if (!orgSlug) {
      await respond("❗ Please provide an org slug. Usage: `/orginfo your-org-slug`");
      return;
    }

    try {
      const userId = command.user_id;
      const result = await app.client.users.info({ user: userId });
      const email = result.user.profile.email;

      const info = await getOrgInfo(email, orgSlug);
      await respond({
        text: `🏢 *${info.name}*\n🔗 Slug: \`${info.slug}\`\n💰 Balance: *${info.balance}*\n📍 Address: ${info.address || 'No address on file'}\n👥 Active Users: ${info.active_cardholders}`,
        response_type: 'ephemeral'
      });
    } catch (err) {
      console.error(err);
      await respond("⚠️ Failed to fetch organization info. Make sure the slug is correct and that you're authorized.");
    }
  });
};