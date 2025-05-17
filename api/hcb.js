const axios = require('axios');
const { PrismaClient } = require('../generated/prisma/client.js');
const prisma = new PrismaClient();

async function sendGrant(organization, amount, note, email, recipient) {
  const user = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase()
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
  const user = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase()
    }
  });
  console.log("Fetched user from DB:", user);
  if (!user || !user.access_token) {
    throw new Error('No access token found for the current user.');
  }

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

async function getOrgInfo(email, orgSlug) {
  const user = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase()
    }
  });

  const res = await fetch(`https://hcb.hackclub.com/api/v4/organizations/${orgSlug}`, {
    headers: {
      Authorization: `Bearer ${user.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Error fetching organization info: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    name: data.name,
    slug: data.slug,
    balance: `$${(data.balance_cents / 100).toFixed(2)}`,
    address: data.address,
    active_cardholders: data.users?.length || 0
  };
}

module.exports = { sendGrant, getOrgs, getOrgInfo };

// Made by @Rushmore at @hackclub
// With help by Mohammed