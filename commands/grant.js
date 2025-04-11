const { getCards, sendGrant } = require('../hcb');

module.exports = async ({ ack, body, client }) => {
  await ack();

  let cards;
  try {
    cards = await getCards();
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    await client.chat.postEphemeral({
      channel: body.channel_id,
      user: body.user.id,
      text: 'Failed to load cards. Please try again later.',
    });
    return;
  }

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
};