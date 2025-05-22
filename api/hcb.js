const { PrismaClient } = require('../generated/prisma/client.js');
const prisma = new PrismaClient();

// Ensure a user record exists (create if missing)
async function findOrCreateUser(email) {
  const normalizedEmail = email.toLowerCase();
  return await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {},
    create: { email: normalizedEmail }
  });
}

async function sendGrant(organization, amount, note, email, recipient) {
  const user = await findOrCreateUser(email);
  if (!user.access_token) {
    throw new Error('Please authenticate first by running /login');
  }
  const res = await fetch(`https://hcb.hackclub.com/api/v4/organizations/${organization}/card_grants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${user.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ // push
      email: recipient,
      amount_cents: parseFloat(amount) * 100,
      note: note || ''
    }),
  });
  if (!res.ok) {
    throw new Error(`Error sending grant: ${res.statusText}`);
  }

  return res.data;
}

async function getOrgs(email) {
  const user = await findOrCreateUser(email);
  if (!user.access_token) {
    throw new Error('Please authenticate first by running /login');
  }
  console.log("Fetched user from DB:", user);

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
  const user = await findOrCreateUser(email);
  if (!user.access_token) {
    throw new Error('Please authenticate first by running /login');
  }

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

module.exports = { sendGrant, getOrgs, getOrgInfo, findOrCreateUser };

// Made by @Rushmore at @hackclub
// With help by Mohammed