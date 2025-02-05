const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { onWebsocketConnect, CURRENT_TASK_ID } = require('./websocketHandlers');
const { testRedisConnectivity, disposeRedisClient } = require('./redisClient');
const dbData = require('./dbData');

const app = express();
const httpServer = http.createServer(app);
const SERVER_PORT = process.env.SERVER_PORT || 4000;
httpServer.listen(SERVER_PORT, () => console.log(`Banking service is running on port ${SERVER_PORT}`));

// Enable the parsing of incoming JSON payloads in HTTP requests
app.use(express.json());

const websocketServer = new WebSocket.Server({ server: httpServer });
websocketServer.on('connection', onWebsocketConnect);

// Middleware to log elapsed time, query string, and post body if present
const logElapsedTime = (req, res, next) => {
  const startTime = Date.now();

  // Capture query string
  const queryString = Object.keys(req.query).length ? JSON.stringify(req.query) : null;

  // Log the request when it's finished
  res.on('finish', () => {
    const elapsedTime = Date.now() - startTime;
    let logMessage = `Task ${CURRENT_TASK_ID}: Elapsed time for ${req.method} ${req.path}: ${elapsedTime.toLocaleString()} ms`;
    if (queryString) logMessage += ` | Query String: ${queryString}`;
    console.log(logMessage);

    // Log the POST body if it's a POST request
    if (req.method === 'POST' && req.body) {
      console.log(`POST Body: ${JSON.stringify(req.body)}`);
    }
  });

  next();
};
app.use(logElapsedTime);

//=========================================================================================================================
// HTTP
//=========================================================================================================================

// Banking routes should be prefixed with /api/banking
const bankingRouter = express.Router();
app.use('/api/banking', bankingRouter);

// Health check endpoint
bankingRouter.get('/health', async (req, res) => {
  try {
    const now = await dbData.healthCheck();
    let keysCount = null;

    if (req.query.redis === 'true') keysCount = await testRedisConnectivity();

    res.status(200).json({
      status: `healthy ; PG: ${now}` + (keysCount !== null ? ` ; Redis: ${keysCount} keys.` : ''),
    });
  } catch (error) {
    console.error('Connection error(s):', error);
    res.status(500).json({ status: 'ERROR', message: 'Connection error(s)' });
  }
});

// Create account
bankingRouter.post('/account', async (req, res) => {
  const { accountId, initialBalance = 0, tenantId } = req.body;
  if (!accountId || !tenantId) {
    return res.status(400).json({ message: 'Account ID and Tenant ID are required' });
  }

  try {
    const result = await dbData.createAccount(accountId, initialBalance, tenantId);
    if (result.rowCount === 0) {
      return res.status(409).json({ message: 'Account already exists' });
    }

    queueExecutedTransaction({ path: req.path, body: req.body });

    res.status(201).json({
      message: 'Account created successfully',
      account: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating account' });
  }
});

// List all accounts
bankingRouter.get('/accounts/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }

  try {
    const result = await dbData.listAccounts(tenantId);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'No accounts found for this tenant' });
    }

    res.json({
      message: 'Accounts retrieved successfully',
      accounts: result.rows,
    });
  } catch (error) {
    console.error('Error retrieving accounts:', error);
    res.status(500).json({ message: 'Error retrieving accounts' });
  }
});

// Handle getting balance requests
bankingRouter.get('/balance/:tenantId/:accountId', async (req, res) => {
  const { tenantId, accountId } = req.params;
  if (!tenantId || !accountId) {
    return res.status(400).json({ message: 'Both Tenant ID and Account ID are required' });
  }

  try {
    const result = await dbData.getBalance(tenantId, accountId);
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
  }
});

// Handle deposit requests
bankingRouter.post('/deposit', async (req, res) => {
  const { amount, accountId, tenantId } = req.body;
  if (!tenantId || !accountId || amount === undefined) {
    return res.status(400).json({ message: 'Account ID, Tenant ID, and Amount are required' });
  }

  try {
    const result = await dbData.deposit(amount, accountId, tenantId);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ message: 'Deposit successful', account: result.rows[0] });

    queueExecutedTransaction({ path: req.path, body: req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing deposit' });
  }
});

// Handle withdraw requests
bankingRouter.post('/withdraw', async (req, res) => {
  const { amount, accountId, tenantId } = req.body;
  if (!tenantId || !accountId || amount === undefined) {
    return res.status(400).json({ message: 'Account ID, Tenant ID, and Amount are required' });
  }

  try {
    const result = await dbData.withdraw(amount, accountId, tenantId);
    if (result.rowCount === 0 || result.rows[0].balance < 0) {
      return res.status(400).json({ message: 'Insufficient funds or account not found' });
    }
    res.json({ message: 'Withdraw successful', account: result.rows[0] });

    queueExecutedTransaction({ path: req.path, body: req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing withdrawal' });
  }
});

// Handle transfer requests
bankingRouter.post('/transfer', async (req, res) => {
  const { amount, fromAccountId, toAccountId, tenantId } = req.body;
  if (!tenantId || !fromAccountId || !toAccountId || amount === undefined) {
    return res.status(400).json({ message: 'From Account ID, To Account ID, Tenant ID, and Amount are required' });
  }

  try {
    const transferResult = await dbData.transfer(amount, fromAccountId, toAccountId, tenantId);
    if (transferResult.error) {
      return res.status(400).json({ message: transferResult.error });
    }

    res.json({
      message: 'Transfer successful',
      fromAccount: transferResult.fromAccount,
      toAccount: transferResult.toAccount,
    });

    queueExecutedTransaction({ path: req.path, body: req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing transfer' });
  }
});

// Handle get all transactions for an account
bankingRouter.get('/transactions/:tenantId/:accountId', async (req, res) => {
  const { accountId, tenantId } = req.params;

  if (!accountId || !tenantId) {
    return res.status(400).json({ message: 'Account ID and Tenant ID are required' });
  }

  try {
    const transactions = await dbData.getAllTransactions(accountId, tenantId);
    res.json({ transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving transactions' });
  }
});

// Handle 404 for all other paths (not found)
app.use((req, res) => {
  console.error({ req, message: 'Path not found' });
  res.status(404).json({ message: 'Path not found' });
});

//=========================================================================================================================
// SQS - queueing executed transactions data
//=========================================================================================================================
const sqsClient = new SQSClient({ region: process.env.APP_AWS_REGION });

async function queueExecutedTransaction(messageBody) {
  const EXECUTED_TRANSACTIONS_QUEUE_URL = process.env.EXECUTED_TRANSACTIONS_QUEUE_URL;
  try {
    const data = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: EXECUTED_TRANSACTIONS_QUEUE_URL,
        MessageGroupId: 'Default', // Required for FIFO queues
        MessageBody: JSON.stringify(messageBody),
      })
    );
    // console.log(`Message sent to SQS: ${data.MessageId}`);
    return data;
  } catch (error) {
    console.error(`Error sending message to SQS queue ${EXECUTED_TRANSACTIONS_QUEUE_URL}:`, error);
    throw error;
  }
}

const cleanup = async () => {
  await disposeRedisClient();
  await dbData.disposeClient();
  console.log(`Task ${CURRENT_TASK_ID}: Closed PostgreSQL and Redis pools.`);
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
