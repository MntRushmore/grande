// This command fetches recent grants for a user or organization from the HCB API. - Doesnt Work Yet.
/*
const fetch = require('node-fetch');
const { prisma } = require('../api/db');
module.exports = async ({ command, ack, respond }) => {
  await ack();

  const query = command.text.trim();
  if (!query) {
    await respond("❗ Please provide an email or org slug. Usage: `/grants_for someone@example.com` or `/grants_for my-club`");
    return;
  }

  try {
    const slackId = command.user_id;
    const user = await prisma.user.findFirst({
      where: { slack_id: slackId }
    });

    if (!user || !user.access_token) {
      await respond("🚫 No access token found for you. Please log in to HCB first.");
      return;
    }

    const res = await fetch(`https://hcb.hackclub.com/api/v4/grants?recipient=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${user.access_token}`
      }
    });

    if (!res.ok) {
      await respond(`⚠️ Could not fetch grants for "${query}".`);
      return;
    }

    const grants = await res.json();
    if (!grants.length) {
      await respond(`📭 No recent grants found for "${query}".`);
      return;
    }

    const latest = grants.slice(0, 5).map(grant => {
      const amount = (grant.amount / 100).toFixed(2);
      const from = grant.sender?.name || 'Unknown';
      return `• $${amount} from *${from}* — ${grant.memo || 'No memo'}`;
    }).join('\n');

    await respond(`📬 Recent grants for *${query}*:\n${latest}`);
  } catch (err) {
    console.error(err);
    await respond("🚨 Something went wrong while fetching grants.");
  }
};
*/