module.exports = async ({ command, ack, say }) => {
  await ack()
  console.log("Slash command received:", command)

  try {
    const text = command.text.trim()
    const orgSlug = text

    if (!orgSlug) {
      await say("Please provide your org slug. Example: `/transactions my-club`")
      return
    }

    const res = await fetch(`https://hcb.hackclub.com/api/v3/organizations/${orgSlug}/transactions`)

    if (!res.ok) {
      await say(`Error fetching transactions: ${res.statusText}`)
      return
    }

    const data = await res.json()
    const topFive = data.slice(0, 5)

    if (topFive.length === 0) {
      await say(`No transactions found for ${orgSlug}.`)
      return
    }

    const formatted = topFive.map(txn =>
      `• *${txn.memo || 'No description'}* — $${(txn.amount_cents / 100).toFixed(2)} on ${new Date(txn.date).toLocaleDateString()}`
    ).join('\n')

    await say(`Here are the 5 most recent transactions for *${orgSlug}*:\n${formatted}`)

  } catch (err) {
    console.error(err)
    await say("Something went wrong fetching public transactions.")
  }
}