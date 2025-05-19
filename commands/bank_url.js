module.exports = async ({ command, ack, respond }) => {
  await ack();

  const orgSlug = command.text.trim();

  if (!orgSlug) {
    await respond("❗ Please provide an org slug. Usage: `/bank_url your-org-slug`");
    return;
  }

  const url = `https://hcb.hackclub.com/${orgSlug}`;
  await respond(`🌐 *Public HCB page for \`${orgSlug}\`*: ${url}`);
};