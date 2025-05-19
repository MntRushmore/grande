const { getOrgInfo } = require('../api/hcb');

module.exports = async ({ command, ack, respond, client }) => {
  await ack();

  const orgSlug = command.text.trim();

  if (!orgSlug) {
    await respond("❗ Please provide an org slug. Usage: `/orginfo your-org-slug`");
    return;
  }

  try {
    const res = await fetch(`https://hcb.hackclub.com/api/v3/organizations/${orgSlug}`);
    if (!res.ok) {
      await respond("❌ Could not fetch public info for that org slug.");
      return;
    }

    const info = await res.json();
    await respond({
      text: `🏢 *${info.name}*\n🔗 Slug: \`${info.slug}\`\n👥 Team Size: ${info.users.length}\n🌐 URL: ${info.url}\n📎 Website: ${info.website || 'N/A'}\n🐙 GitHub: ${info.github || 'N/A'}\n🐦 Twitter: ${info.twitter || 'N/A'}`,
      response_type: 'ephemeral'
    });
  } catch (err) {
    console.error(err);
    await respond("⚠️ Failed to fetch public org info.");
  }
};