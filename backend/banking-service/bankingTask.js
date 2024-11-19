const express = require('express');
const { Pool } = require('pg');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const sqs = new SQSClient({ region: process.env.APP_AWS_REGION });
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const pool = new Pool({
  host: process.env.RDS_ENDPOINT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false, // TODO: Handle SSL before production!
  },
});
pool
  .connect()
  .then(() => console.log('Connected to database'))
  .catch((err) => {
    console.error('Database connection error', err);
    process.exit(1); // Exit the process to indicate failure
  });

process.on('SIGINT', async () => {
  await pool.end();
  console.log('Pool has ended');
  process.exit(0);
});

// Banking routes should be prefixed with /api/banking
const bankingRouter = express.Router();
app.use('/api/banking', bankingRouter);

// Health check endpoint
bankingRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// New endpoint: Create account
bankingRouter.post('/account', async (req, res) => {
  const { accountId, initialBalance = 0, tenantId } = req.body;
  if (!accountId || !tenantId) {
    return res.status(400).json({ message: 'Account ID and Tenant ID are required' });
  }

  const client = await pool.connect();
  try {
    // Check if account already exists for the tenant
    const existingAccount = await client.query('SELECT account_id FROM accounts WHERE account_id = $1 AND tenant_id = $2', [accountId, tenantId]);
    if (existingAccount.rowCount > 0) {
      return res.status(409).json({ message: 'Account already exists' });
    }

    // Create new account
    const result = await client.query('INSERT INTO accounts (account_id, balance, tenant_id) VALUES ($1, $2, $3) RETURNING *', [
      accountId,
      initialBalance,
      tenantId,
    ]);

    sendMessageToSQS({ path: req.path, body: req.body });

    res.status(201).json({
      message: 'Account created successfully',
      account: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating account' });
  } finally {
    client.release();
  }
});

// Handle getting balance requests
bankingRouter.get('/balance/:tenantId/:accountId', async (req, res) => {
  const { tenantId, accountId } = req.params;
  if (!tenantId || !accountId) {
    return res.status(400).json({ message: 'Both Tenant ID and Account ID are required' });
  }

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT balance FROM accounts WHERE account_id = $1 AND tenant_id = $2', [accountId, tenantId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({
      message: 'Balance retrieved successfully',
      accountId: accountId,
      balance: result.rows[0].balance,
    });
  } catch (error) {
    console.error('Error retrieving balance:', error);
    res.status(500).json({ message: 'Error retrieving balance' });
  } finally {
    client.release();
  }
});

// Handle deposit requests
bankingRouter.post('/deposit', async (req, res) => {
  const { amount, accountId, tenantId } = req.body;
  if (!tenantId || !accountId || amount === undefined) {
    return res.status(400).json({ message: 'Account ID, Tenant ID, and Amount are required' });
  }

  const client = await pool.connect();
  try {
    const result = await client.query('UPDATE accounts SET balance = balance + $1 WHERE account_id = $2 AND tenant_id = $3 RETURNING *', [
      amount,
      accountId,
      tenantId,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ message: 'Deposit successful', account: result.rows[0] });

    sendMessageToSQS({ path: req.path, body: req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing deposit' });
  } finally {
    client.release();
  }
});

// Handle withdraw requests
bankingRouter.post('/withdraw', async (req, res) => {
  const { amount, accountId, tenantId } = req.body;
  if (!tenantId || !accountId || amount === undefined) {
    return res.status(400).json({ message: 'Account ID, Tenant ID, and Amount are required' });
  }

  const client = await pool.connect();
  try {
    const result = await client.query('UPDATE accounts SET balance = balance - $1 WHERE account_id = $2 AND tenant_id = $3 RETURNING *', [
      amount,
      accountId,
      tenantId,
    ]);
    if (result.rowCount === 0 || result.rows[0].balance < 0) {
      return res.status(400).json({ message: 'Insufficient funds or account not found' });
    }
    res.json({ message: 'Withdraw successful', account: result.rows[0] });

    sendMessageToSQS({ path: req.path, body: req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing withdrawal' });
  } finally {
    client.release();
  }
});

// Handle transfer requests
bankingRouter.post('/transfer', async (req, res) => {
  const { amount, fromAccountId, toAccountId, tenantId } = req.body;
  if (!tenantId || !fromAccountId || !toAccountId || amount === undefined) {
    return res.status(400).json({ message: 'From Account ID, To Account ID, Tenant ID, and Amount are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const withdrawResult = await client.query('UPDATE accounts SET balance = balance - $1 WHERE account_id = $2 AND tenant_id = $3 RETURNING *', [
      amount,
      fromAccountId,
      tenantId,
    ]);
    if (withdrawResult.rowCount === 0 || withdrawResult.rows[0].balance < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'From account not found or Insufficient funds' });
    }

    const depositResult = await client.query('UPDATE accounts SET balance = balance + $1 WHERE account_id = $2 AND tenant_id = $3 RETURNING *', [
      amount,
      toAccountId,
      tenantId,
    ]);
    if (depositResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'To account not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Transfer successful', fromAccount: withdrawResult.rows[0], toAccount: depositResult.rows[0] });

    sendMessageToSQS({ path: req.path, body: req.body });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error processing transfer' });
  } finally {
    client.release();
  }
});

// Handle 404 for all other paths (not found)
app.use((req, res) => {
  console.error({ req, message: 'Path not found' });
  res.status(404).json({ message: 'Path not found' });
});

app.listen(PORT, () => {
  console.log(`Banking service is running on port ${PORT}`);
});

// Function to insert a message into an SQS queue
async function sendMessageToSQS(messageBody) {
  try {
    const data = await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageGroupId: 'Default', // Required for FIFO queues
        MessageBody: JSON.stringify(messageBody),
      })
    );
    console.log(`Message sent to SQS: ${data.MessageId}`);
    return data;
  } catch (error) {
    console.error('Error sending message to SQS:', error);
    throw error;
  }
}
