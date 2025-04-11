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
    amount: parseFloat(amount) * 100,
    note,
  });
  return res.data;
}

module.exports = { getCards, sendGrant };