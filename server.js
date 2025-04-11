// server.js
const { App } = require('@slack/bolt');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const grantCommand = require('./commands/grant');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.command('/grant', grantCommand);

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('Slack bot running');
})();

const expressApp = express();
expressApp.use(bodyParser.json());

expressApp.get('/', (req, res) => res.send('Slack HCB Granter Bot'));

expressApp.listen(3001, () => console.log('Express server running'));


// commands/grant.js
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


// api/hcb.js
const axios = require('axios');

const api = axios.create({
  baseURL: process.env.HCB_API_BASE_URL,
  headers: { Authorization: `Bearer ${process.env.HCB_API_KEY}` },
});

async function getCards() {
  const res = await api.get('/cards');
  return res.data;
}

async function sendGrant(cardId, amount, note) {
  const res = await api.post(`/cards/${cardId}/grants`, {
    amount: parseFloat(amount) * 100, // cents
    note,
  });
  return res.data;
}

module.exports = { getCards, sendGrant };
