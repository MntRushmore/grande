const axios = require('axios');
const { PrismaClient } = require('../generated/prisma/client.js');
const prisma = new PrismaClient();

async function sendGrant(organization, amount, note, email, recipient) {
  const user = await prisma.user.findFirst({
    where: {
      email: email
    }
  });
  console.log(user);
  const api = axios.create({
    baseURL: process.env.HCB_API_BASE_URL,
    headers: { Authorization: `Bearer ${user.access_token}` },
  });
  const res = await api.post(`/organizations/${organization}/card_grants`, {
    email: recipient,
    amount: parseFloat(amount) * 100,
    purpose: note,
  });
  return res.data;
}

async function getOrgs(email) {
  console.log(email)
  const users = await prisma.user.findMany({
  });
  console.log(users); 
  const user = await prisma.user.findFirst({
    where: {
      email: email
    }
  });
  console.log(user);
  const api = axios.create({
    baseURL: process.env.HCB_API_BASE_URL,
    headers: { Authorization: `Bearer ${user.access_token}` },
  });
  const res = await api.get('/organizations');
  const formattedOrgs = res.data.map(org => ({
    text: { type: 'plain_text', text: org.name },
    value: org.slug
  }));
  return formattedOrgs;
}

module.exports = { sendGrant, getOrgs };