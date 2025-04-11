const axios = require('axios');
const { PrismaClient } = require('../generated/prisma/client.js');
const prisma = new PrismaClient();

async function sendGrant(organization, amount, note, email, recipient) {
  const user = await prisma.user.findFirst({
    where: {
      email: email
    }
  });
  const res = await fetch(`https://hcb.hackclub.com/api/v4/organizations/${organization}/card_grants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${user.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: recipient,
      amount_cents: parseFloat(amount) * 100,
    }),
  });
  if (!res.ok) {
    throw new Error(`Error sending grant: ${res.statusText}`);
  }

  return res.data;
}

async function getOrgs(email) {
  console.log(email)
  const user = await prisma.user.findFirst({
    where: {
      email: email
    }
  });
  const res = await fetch("https://hcb.hackclub.com/api/v4/user/organizations", {
    headers: {
      Authorization: `Bearer ${user.access_token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Error fetching organizations: ${res.statusText}`);
  }
  const data = await res.json();
  const formattedOrgs = data.map(org => ({
    text: { type: 'plain_text', text: org.name },
    value: org.slug
  }));
  return formattedOrgs;
}

module.exports = { sendGrant, getOrgs };