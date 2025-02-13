const { Pool } = require('pg');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const pgPool = new Pool({
  host: process.env.RDS_ENDPOINT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false, // TODO: Handle SSL before production!
  },
});

// Middleware for logging parameters
const logMiddleware = (fn) => {
  const wrappedFunction = async function (...args) {
    if (process.env.ENABLE_ENHANCED_LOGGING.toLowerCase() === 'true') {
      console.log(`Calling function: ${fn.name} with parameters: ${JSON.stringify(args)}`);
    }
    return await fn(...args);
  };
  wrappedFunction.name = fn.name;
  return wrappedFunction;
};

// Check the health of the database
const healthCheck = async () => {
  const pgClient = await pgPool.connect();
  try {
    const now = await pgClient.query('SELECT NOW()');
    return now.rows[0].now;
  } catch (error) {
    console.error('Health check failed', error);
    throw error;
  } finally {
    pgClient.release();
  }
};

// Create an account
const createAccount = logMiddleware(async (accountId, initialBalance, user_id, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query(
      `
      INSERT INTO accounts (account_id, balance, user_id, tenant_id, is_disabled) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (account_id, tenant_id) DO NOTHING 
      RETURNING *`,
      [accountId, initialBalance, user_id, tenantId, true]
    );
    enqueueExecutedTransaction({ bankingFunction: 'createAccount', accountId, tenantId });
    return result.rows[0] || undefined;
  } catch (error) {
    console.error('Error creating account', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

// Enable or disable an account
const setAccountState = logMiddleware(async (accountId, is_disabled, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query(
      `
      UPDATE accounts 
      SET is_disabled = $2, updated_at = NOW() 
      WHERE account_id = $1 AND tenant_id = $3 
      RETURNING *`,
      [accountId, is_disabled, tenantId]
    );
    return result.rows[0]; // Return the updated account details
  } catch (error) {
    console.error('Error enabling account', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

// Delete an account
const deleteAccount = logMiddleware(async (accountId, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query(
      `
      DELETE FROM accounts 
      WHERE account_id = $1 AND tenant_id = $2 
      RETURNING account_id`,
      [accountId, tenantId]
    );

    if (result.rowCount === 0) throw new Error('Account not found');

    return result.rows[0]; // Return the deleted account details
  } catch (error) {
    console.error('Error deleting account', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

// Get all accounts
const getAllAccounts = logMiddleware(async (tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query(
      'SELECT account_id,user_id,balance,is_disabled,created_at,updated_at FROM accounts WHERE tenant_id = $1 ORDER BY updated_at DESC',
      [tenantId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error listing accounts', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

// Get accounts by user id
const getAccountsByUserId = logMiddleware(async (userId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query(
      'SELECT account_id,balance,is_disabled,tenant_id,created_at,updated_at FROM accounts WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting accounts by userId', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

// Get account balance
const getAccountBalance = logMiddleware(async (tenantId, accountId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query('SELECT balance FROM accounts WHERE account_id = $1 AND tenant_id = $2', [accountId, tenantId]);
    const accountFound = result.rows.length > 0;
    const balance = accountFound ? result.rows[0].balance : null;
    return { balance, accountFound };
  } catch (error) {
    console.error('Error getting balance', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

// Deposit
const deposit = logMiddleware(async (amount, accountId, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query('UPDATE accounts SET balance = balance + $1 WHERE account_id = $2 AND tenant_id = $3 RETURNING *', [
      amount,
      accountId,
      tenantId,
    ]);
    enqueueExecutedTransaction({ bankingFunction: 'deposit', amount, accountId, tenantId });
    return result.rows;
  } catch (error) {
    console.error('Error during deposit', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

//  Withdraw
const withdraw = logMiddleware(async (amount, accountId, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query(
      `
      UPDATE accounts 
      SET balance = balance - $1
      WHERE account_id = $2 AND tenant_id = $3 
      RETURNING *`,
      [amount, accountId, tenantId]
    );
    enqueueExecutedTransaction({ bankingFunction: 'withdraw', amount, accountId, tenantId });
    return result.rows;
  } catch (error) {
    console.error('Error during withdrawal', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

// Transfer between two accounts
const transfer = logMiddleware(async (amount, fromAccountId, toAccountId, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    await pgClient.query('BEGIN');
    const withdrawResult = await withdraw(amount, fromAccountId, tenantId);
    let depositResult;
    if (withdrawResult.length === 0) await pgClient.query('ROLLBACK');
    else {
      depositResult = await deposit(amount, toAccountId, tenantId);
      if (depositResult.length === 0) await pgClient.query('ROLLBACK');
      else await pgClient.query('COMMIT');
    }
    enqueueExecutedTransaction({ bankingFunction: 'transfer', amount, fromAccountId, toAccountId, tenantId });
    return { withdrawResult, depositResult };
  } catch (error) {
    await pgClient.query('ROLLBACK');
    console.error('Error during transfer', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

// Get transactions for an account
const getTransactions = logMiddleware(async (accountId, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query(
      'SELECT id,executed_at,transaction FROM accountTransactions WHERE account_id = $1 AND tenant_id = $2 ORDER BY executed_at DESC',
      [accountId, tenantId]
    );

    return result.rows.map((row) => {
      const decryptedTransaction = /*decrypt(*/ row.transaction; /*)*/
      const transactionObject = JSON.parse(decryptedTransaction);
      return {
        id: row.id,
        executed_at: row.executed_at,
        ...transactionObject,
      };
    });
  } catch (error) {
    console.error('Error getting transactions', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

// Dispose the database client
async function disposeClient() {
  if (pgPool) await pgPool.end();
}

//=========================================================================================================================
// SQS - queueing executed transactions data
//=========================================================================================================================
const sqsClient = new SQSClient({ region: process.env.APP_AWS_REGION });

async function enqueueExecutedTransaction(messageBody) {
  const EXECUTED_TRANSACTIONS_QUEUE_URL = process.env.EXECUTED_TRANSACTIONS_QUEUE_URL;
  try {
    const data = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: EXECUTED_TRANSACTIONS_QUEUE_URL,
        MessageGroupId: 'Default', // Required for FIFO queues
        MessageBody: JSON.stringify({ ...messageBody, timeStamp: new Date().toISOString() /* to prevent de-duplication in SQS */ }),
      })
    );
    // console.log(`Message sent to SQS: ${data.MessageId}`);
    return data;
  } catch (error) {
    console.error(`Error sending message to SQS queue ${EXECUTED_TRANSACTIONS_QUEUE_URL}:`, error);
    throw error;
  }
}

module.exports = {
  createAccount,
  setAccountState,
  getAllAccounts,
  getAccountsByUserId,
  getTransactions,
  getAccountBalance,
  deposit,
  withdraw,
  transfer,
  healthCheck,
  disposeClient,
  deleteAccount,
};
