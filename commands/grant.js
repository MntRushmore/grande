const { getCards, sendGrant, findOrCreateUser } = require('../api/hcb.js');

module.exports = async ({ ack, body, client }) => {
  await ack();

  console.log("👉 /grant command invoked, trigger_id:", body.trigger_id);

  // Check that the user is authenticated
  const user = await findOrCreateUser(body.user_id);
  if (!user.access_token) {
    await client.chat.postEphemeral({
      channel: body.channel_id,
      user: body.user_id,
      text: 'Please authenticate by running /login before using this command.',
    });
    return;
  }

  let cards;
  try {
    cards = await getCards();
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    await client.chat.postEphemeral({
      channel: body.channel_id,
      user: body.user_id,
      text: 'Failed to load cards. Please try again later.',
    });
    return;
  }

  try {
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
            type: 'input',
            block_id: 'card_block',
            element: {
              type: 'static_select',
              action_id: 'card',
              options: cards.map((card) => ({
                text: { type: 'plain_text', text: card.name },
                value: card.id,
              })),
            },
            label: { type: 'plain_text', text: 'Card' },
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
          {
            type: 'input',
            block_id: 'note_block',
            element: {
              type: 'plain_text_input',
              action_id: 'note',
              multiline: true,
            },
            label: { type: 'plain_text', text: 'Note' },
            optional: true,
          },
        ],
      },
    });
  } catch (error) {
    console.error("❌ views.open failed in /grant command:", error);
  }
};