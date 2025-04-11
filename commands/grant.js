const { getCards, sendGrant } = require('../api/hcb');

module.exports = async ({ ack, body, client }) => {
  await ack();

  const cards = await getCards();

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