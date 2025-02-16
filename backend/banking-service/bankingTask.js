const http = require('http');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { CURRENT_TASK_ID } = require('./constants');
const { onWebsocketConnect } = require('./websocketHandlers');
const { testRedisConnectivity, disposeRedisClient } = require('./redisClient');
const dbData = require('./dbData');

const app = express();
const httpServer = http.createServer(app);
const SERVER_PORT = process.env.SERVER_PORT || 4000;
httpServer.listen(SERVER_PORT, () => console.log(`Banking service is running on port ${SERVER_PORT}`));

// Enable the parsing of incoming JSON payloads in HTTP requests
app.use(express.json());

// Enable CORS for all routes
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const websocketServer = new WebSocket.Server({ server: httpServer });
websocketServer.on('connection', onWebsocketConnect);

// Middleware to log elapsed time, query string, and post body if present
const logElapsedTime = (req, res, next) => {
  const startTime = Date.now();

  // Capture query string
  const queryString = Object.keys(req.query).length ? JSON.stringify(req.query) : null;

  // Capture the original res.status function
  const originalStatus = res.status;
  res.status = function (code) {
    if (code >= 400) {
      const error = req.error || new Error(`HTTP ${code}`);
      console.error(`Task ${CURRENT_TASK_ID}: Error in ${req.method} ${req.path}:`, error);
    }
    return originalStatus.apply(this, arguments);
  };

  // Log the request when it's finished
  res.on('finish', () => {
    const elapsedTime = Date.now() - startTime;
    let logMessage = `Task ${CURRENT_TASK_ID}: Elapsed time for ${req.method} ${req.path}: ${elapsedTime.toLocaleString()} ms`;
    if (queryString) logMessage += ` | Query String: ${queryString}`;
    console.log(logMessage);

    // Log the POST body if it's a POST request
    if (req.method === 'POST' && req.body) console.log(`POST Body: ${JSON.stringify(req.body)}`);
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

    res.status(200).json({ status: `healthy ; PG: ${now}` + (keysCount !== null ? ` ; Redis: ${keysCount} keys.` : '') });
  } catch (error) {
    req.error = error;
    res.status(500).json({ status: 'ERROR', message: 'Connection error(s)' });
  }
});

// Create a user
bankingRouter.post('/user', async (req, res) => {
  const { userId, userName, email } = req.body;
  if (!userId || !userName || !email) return res.status(400).json({ message: 'User ID, User Name, and Email are required' });

  try {
    const result = await dbData.insertUser(userId, userName, email, process.env.TENANT_ID);
    res.status(201).json({
      message: 'User created successfully',
      payload: result,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Get all users
bankingRouter.get('/users', async (req, res) => {
  try {
    const users = await dbData.getAllUsers(process.env.TENANT_ID);
    res.json({ status: 'OK', users });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ status: 'ERROR', message: 'Failed to retrieve users' });
  }
});

// Create an account
bankingRouter.post('/account', async (req, res) => {
  const { accountId, initialBalance = 0, userId } = req.body;
  if (!accountId || !userId) return res.status(400).json({ message: 'Account ID and User ID are required' });

  try {
    const result = await dbData.createAccount(accountId, initialBalance, userId, process.env.TENANT_ID);
    if (!result) return res.status(409).json({ message: 'Account already exists' });

    // Enable the account after creation
    await dbData.setAccountState(accountId, false, process.env.TENANT_ID);

    res.status(201).json({
      message: 'Account created successfully',
      payload: { ...result, is_disabled: false },
    });
  } catch (error) {
    req.error = error;
    res.status(500).json({ message: 'Error creating account' });
  }
});

// Get all accounts
bankingRouter.get('/accounts', async (req, res) => {
  try {
    const result = await dbData.getAllAccounts(process.env.TENANT_ID);
    if (result.length === 0) return res.status(404).json({ message: 'No accounts found' });
    res.json({
      message: 'Accounts retrieved successfully',
      payload: result,
    });
  } catch (error) {
    req.error = error;
    res.status(500).json({ message: 'Error retrieving accounts' });
  }
});

// Get accounts by user ID
bankingRouter.get('/accounts/user', async (req, res) => {
  const { userId } = req.query;

  try {
    const accounts = await dbData.getAccountsByUserId(userId, process.env.TENANT_ID);
    res.json({
      message: 'Accounts retrieved successfully',
      payload: accounts,
    });
  } catch (error) {
    console.error('Error retrieving accounts by user ID:', error);
    res.status(500).json({ message: 'Error retrieving accounts' });
  }
});

// Get all accounts grouped by user:
// [
//   {
//       "user_id": "43e4c8a2-4081-70d9-613a-244f8f726307",
//       "user_name": "Betty User",
//       "accounts": [
//           {
//               "account_id": "39e49084-f32d-49bf-9d47-40c1dad9c06c",
//               "balance": 300,
//               "is_disabled": false,
//               "created_at": "2025-02-15T18:05:47.59694+00:00",
//               "updated_at": "2025-02-15T18:05:47.60156+00:00"
//           },
//           {
//               "account_id": "dfa72097-597b-4199-b44d-70c96e3070d6",
//               "balance": 200,
//               "is_disabled": false,
//               "created_at": "2025-02-15T18:05:47.408421+00:00",
//               "updated_at": "2025-02-15T18:05:47.411317+00:00"
//           }
//       ]
//   }
// ]
bankingRouter.get('/accounts/grouped', async (req, res) => {
  try {
    const usersAccounts = await dbData.getAllAccountsByUserId(process.env.TENANT_ID);
    const response = {
      message: 'Accounts grouped by user retrieved successfully',
      payload: usersAccounts,
    };
    res.json(response);
  } catch (error) {
    console.error('[GET /accounts/grouped] Error:', error);
    res.status(500).json({ message: 'Error retrieving grouped accounts' });
  }
});

// Get account balance
bankingRouter.get('/balance/:accountId', async (req, res) => {
  const { accountId } = req.params;
  if (!accountId) return res.status(400).json({ message: 'Account ID is required' });

  try {
    const { balance, accountFound } = await dbData.getAccountBalance(process.env.TENANT_ID, accountId);
    if (!accountFound) return res.status(404).json({ message: 'Account not found' });
    res.json({
      message: 'Balance retrieved successfully',
      payload: { accountId, balance },
    });
  } catch (error) {
    req.error = error;
    res.status(500).json({ message: 'Error retrieving balance' });
  }
});

// Deposit
bankingRouter.post('/deposit', async (req, res) => {
  const { amount, accountId } = req.body;
  if (!accountId || amount === undefined) return res.status(400).json({ message: 'Account ID and Amount are required' });

  try {
    const result = await dbData.deposit(undefined, amount, accountId, process.env.TENANT_ID);
    if (!result) return res.status(404).json({ message: 'Account not found' });
    res.json({
      message: 'Deposit successful',
      payload: result,
    });
  } catch (error) {
    req.error = error;
    res.status(500).json({ message: 'Error processing deposit' });
  }
});

// Withdraw
bankingRouter.post('/withdraw', async (req, res) => {
  const { amount, accountId } = req.body;
  if (!accountId || amount === undefined) return res.status(400).json({ message: 'Account ID and Amount are required' });

  try {
    const result = await dbData.withdraw(undefined, amount, accountId, process.env.TENANT_ID);
    if (!result) return res.status(404).json({ message: 'Account not found' });
    res.json({
      message: 'Withdraw successful',
      payload: result,
    });
  } catch (error) {
    req.error = error;
    res.status(500).json({ message: 'Error processing withdrawal' });
  }
});

// Transfer (between two accounts)
bankingRouter.post('/transfer', async (req, res) => {
  const { amount, fromAccountId, toAccountId } = req.body;
  if (!fromAccountId || !toAccountId || amount === undefined)
    return res.status(400).json({ message: 'From Account ID, To Account ID, and Amount are required' });

  try {
    const transferResult = await dbData.transfer(undefined, amount, fromAccountId, toAccountId, process.env.TENANT_ID);
    if (!transferResult.accounts.withdrawResult) return res.status(404).json({ message: 'From Account not found' });
    else if (!transferResult.accounts.depositResult) return res.status(404).json({ message: 'To Account not found' });
    else {
      res.json({
        message: 'Transfer successful',
        payload: transferResult,
      });
    }
  } catch (error) {
    req.error = error;
    res.status(500).json({ message: 'Error processing transfer' });
  }
});

// Get all transactions for an account
bankingRouter.get('/transactions/:accountId', async (req, res) => {
  const { accountId } = req.params;

  if (!accountId) return res.status(400).json({ message: 'Account ID is required' });

  try {
    const transactions = await dbData.getTransactions(accountId, process.env.TENANT_ID);
    res.json({
      message: 'Transactions retrieved successfully',
      payload: transactions,
    });
  } catch (error) {
    req.error = error;
    res.status(500).json({ message: 'Error retrieving transactions' });
  }
});

// Handle 404 for all other paths (not found)
app.use((req, res) => {
  console.error({ req, message: 'Path not found' });
  res.status(404).json({ message: 'Path not found' });
});

const cleanup = async () => {
  await disposeRedisClient();
  await dbData.disposeClient();
  console.log(`Task ${CURRENT_TASK_ID}: Closed PostgreSQL and Redis pools.`);
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
