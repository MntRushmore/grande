const express = require('express');
const { PrismaClient } = require('@prisma/client');
const app = express();
const prisma = new PrismaClient();

app.get('/logs', async (req, res) => {
  const logs = await prisma.grantLog.findMany({ orderBy: { createdAt: 'desc' } });
  const html = `
    <html><body>
      <h1>Grant Logs</h1>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><th>Email</th><th>Org</th><th>Amount (¢)</th><th>Recipient</th><th>Time</th></tr>
        ${logs.map(log => `<tr>
          <td>${log.email}</td>
          <td>${log.org}</td>
          <td>${log.amount}</td>
          <td>${log.recipient}</td>
          <td>${new Date(log.createdAt).toLocaleString()}</td>
        </tr>`).join('')}
      </table>
    </body></html>
  `;
  res.send(html);
});

app.listen(3000, () => console.log('Log viewer running at http://localhost:3000/logs'));