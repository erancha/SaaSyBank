const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Banking routes should be prefixed with /api/banking
const bankingRouter = express.Router();
app.use('/api/banking', bankingRouter);

// Health check endpoint
bankingRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Handle deposit requests
bankingRouter.post('/deposit', (req, res) => {
  const { amount, accountId, tenantId } = req.body;

  console.log(`Deposit request received - Amount: ${amount}, Account ID: ${accountId}, Tenant ID: ${tenantId}`);

  res.json({ message: 'Deposit successful', amount, accountId, tenantId });
});

// Handle withdraw requests
bankingRouter.post('/withdraw', (req, res) => {
  const { amount, accountId, tenantId } = req.body;

  console.log(`Withdraw request received - Amount: ${amount}, Account ID: ${accountId}, Tenant ID: ${tenantId}`);

  res.json({ message: 'Withdraw successful', amount, accountId, tenantId });
});

// Handle transfer requests
bankingRouter.post('/transfer', (req, res) => {
  const { amount, fromAccountId, toAccountId, tenantId } = req.body;

  console.log(
    `Transfer request received - Amount: ${amount}, From Account ID: ${fromAccountId}, To Account ID: ${toAccountId}, Tenant ID: ${tenantId}`
  );

  res.json({ message: 'Transfer successful', amount, fromAccountId, toAccountId, tenantId });
});

// Handle 404 for all other paths (not found)
app.use((req, res) => {
  console.error({ req, message: 'Path not found' });
  res.status(404).json({ message: 'Path not found' });
});

app.listen(PORT, () => {
  console.log(`Banking service is running on port ${PORT}`);
});
