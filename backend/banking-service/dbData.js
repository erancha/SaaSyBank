const { Pool } = require('pg');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { v4: uuidv4 } = require('uuid');

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
const logMiddleware = (name) => (fn) => {
  const wrappedFunction = async function (...args) {
    if (process.env.ENABLE_ENHANCED_LOGGING.toLowerCase() === 'true') {
      console.log(`Calling function '${name}' with parameters: ${JSON.stringify(args)}`);
    }
    return await fn(...args);
  };
  wrappedFunction.name = name;
  return wrappedFunction;
};

// Check the health of the database
const healthCheck = logMiddleware('healthCheck')(async () => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const now = await pgClient.query('SELECT NOW()');
    return now.rows[0].now;
  } catch (error) {
    console.error('Health check failed', error);
    throw error;
  } finally {
    if (pgClient) pgClient.release();
  }
});

// Create an account
const createAccount = logMiddleware('createAccount')(async (account_id, initialBalance, user_id, tenant_id) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      `
      INSERT INTO accounts (account_id, balance, user_id, tenant_id, is_disabled) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (account_id, tenant_id) DO NOTHING 
      RETURNING *`,
      [account_id, initialBalance, user_id, tenant_id, true]
    );
    // TODO: Redesign - enqueueExecutedTransaction({ bankingFunction: 'createAccount', account_id, tenant_id });
    return result.rows[0] || undefined;
  } catch (error) {
    console.error('Error creating account', error);
    throw error; // Rethrow the error
  } finally {
    if (pgClient) pgClient.release();
  }
});

// Enable or disable an account
const setAccountState = logMiddleware('setAccountState')(async (account_id, is_disabled, tenant_id) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      `
      UPDATE accounts 
      SET is_disabled = $2, updated_at = NOW() 
      WHERE account_id = $1 AND tenant_id = $3 
      RETURNING *`,
      [account_id, is_disabled, tenant_id]
    );
    return result.rows[0]; // Return the updated account details
  } catch (error) {
    console.error('Error enabling account', error);
    throw error; // Rethrow the error
  } finally {
    if (pgClient) pgClient.release();
  }
});

// Delete an account
const deleteAccount = logMiddleware('deleteAccount')(async (account_id, tenant_id) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      `
      DELETE FROM accounts 
      WHERE account_id = $1 AND tenant_id = $2 
      RETURNING account_id,user_id`,
      [account_id, tenant_id]
    );

    if (result.rowCount === 0) throw new Error('Account not found');

    return result.rows[0]; // Return the deleted account details
  } catch (error) {
    console.error('Error deleting account', error);
    throw error; // Rethrow the error
  } finally {
    if (pgClient) pgClient.release();
  }
});

// Get all accounts
const getAllAccounts = logMiddleware('getAllAccounts')(async (tenant_id) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      'SELECT account_id,user_id,balance,is_disabled,created_at,updated_at FROM accounts WHERE tenant_id = $1 ORDER BY updated_at DESC',
      [tenant_id]
    );
    return result.rows;
  } catch (error) {
    console.error('Error listing accounts', error);
    throw error; // Rethrow the error
  } finally {
    if (pgClient) pgClient.release();
  }
});

// Get accounts by user id
const getAccountsByUserId = logMiddleware('getAccountsByUserId')(async (userId) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      'SELECT account_id,balance,is_disabled,tenant_id,created_at,updated_at FROM accounts WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting accounts by userId', error);
    throw error; // Rethrow the error
  } finally {
    if (pgClient) pgClient.release();
  }
});

// Get account balance
const getAccountBalance = logMiddleware('getAccountBalance')(async (tenant_id, account_id) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query('SELECT balance FROM accounts WHERE account_id = $1 AND tenant_id = $2', [account_id, tenant_id]);
    const accountFound = result.rows.length > 0;
    const balance = accountFound ? result.rows[0].balance : null;
    return { balance, accountFound };
  } catch (error) {
    console.error('Error getting balance', error);
    throw error; // Rethrow the error
  } finally {
    if (pgClient) pgClient.release();
  }
});

// Deposit
const deposit = logMiddleware('deposit')(async (id, amount, account_id, tenant_id, shouldLogTransaction = true, pgClientParam) => {
  let pgClient = pgClientParam;
  let shouldManageConnection = !pgClientParam;
  try {
    if (shouldManageConnection) {
      pgClient = await pgPool.connect();
      await pgClient.query('BEGIN');
    }
    const accountResult = await pgClient.query(
      'UPDATE accounts SET balance = balance + $1 WHERE account_id = $2 AND tenant_id = $3 AND NOT is_disabled RETURNING *',
      [amount, account_id, tenant_id]
    );
    if (accountResult.rows.length > 0) {
      let result = { account: accountResult.rows[0] };
      if (shouldLogTransaction) {
        const transactionData = { bankingFunction: 'deposit', amount };
        const transactionDataForLog = { ...transactionData, account_id, tenant_id };
        const transactionId = await logTransaction(id, tenant_id, account_id, transactionDataForLog);
        if (shouldManageConnection) await pgClient.query('COMMIT');

        // Return both transaction and account data
        result = {
          id: transactionId,
          ...transactionData,
          executed_at: new Date().toISOString(),
          ...result,
        };
      }
      // TODO: Redesign - enqueueExecutedTransaction(result);
      return result;
    } else {
      if (shouldManageConnection) await pgClient.query('ROLLBACK');
      return null;
    }
  } catch (error) {
    console.error('Error during deposit', error);
    throw error;
  } finally {
    if (shouldManageConnection && pgClient) pgClient.release();
  }
});

//  Withdraw
const withdraw = logMiddleware('withdraw')(async (id, amount, account_id, tenant_id, shouldLogTransaction = true, pgClientParam) => {
  let pgClient = pgClientParam;
  let shouldManageConnection = !pgClientParam;
  try {
    if (shouldManageConnection) {
      pgClient = await pgPool.connect();
      await pgClient.query('BEGIN');
    }
    const accountResult = await pgClient.query(
      'UPDATE accounts SET balance = balance - $1 WHERE account_id = $2 AND tenant_id = $3 AND balance >= $1 AND NOT is_disabled RETURNING *',
      [amount, account_id, tenant_id]
    );
    if (accountResult.rows.length > 0) {
      let result = { account: accountResult.rows[0] };
      if (shouldLogTransaction) {
        const transactionData = { bankingFunction: 'withdraw', amount };
        const transactionDataForLog = { ...transactionData, account_id, tenant_id };
        const transactionId = await logTransaction(id, tenant_id, account_id, transactionDataForLog);
        if (shouldManageConnection) await pgClient.query('COMMIT');

        // Return both transaction and account data
        result = {
          id: transactionId,
          ...transactionData,
          executed_at: new Date().toISOString(),
          ...result,
        };
      }
      // TODO: Redesign - enqueueExecutedTransaction(result);
      return result;
    } else {
      if (shouldManageConnection) await pgClient.query('ROLLBACK');
      return null;
    }
  } catch (error) {
    console.error('Error during withdrawal', error);
    throw error;
  } finally {
    if (shouldManageConnection && pgClient) pgClient.release();
  }
});

// Transfer between two accounts
const transfer = logMiddleware('transfer')(async (id, amount, from_account_id, to_account_id, tenant_id) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    await pgClient.query('BEGIN');
    let depositResult;
    const withdrawResult = await withdraw(undefined, amount, from_account_id, tenant_id, false, pgClient);
    if (!withdrawResult) await pgClient.query('ROLLBACK');
    else {
      depositResult = await deposit(undefined, amount, to_account_id, tenant_id, false, pgClient);
      if (!depositResult) await pgClient.query('ROLLBACK');
      else {
        const transactionData = { bankingFunction: 'transfer', amount, from_account_id, to_account_id };
        const transactionDataForLog = { ...transactionData, tenant_id };
        const transactionId = await logTransaction(id, tenant_id, from_account_id, transactionDataForLog);
        await logTransaction(undefined, tenant_id, to_account_id, transactionDataForLog);
        await pgClient.query('COMMIT');

        // Return both transaction and account data
        const result = {
          id: transactionId,
          ...transactionData,
          executed_at: new Date().toISOString(),
          accounts: { withdrawResult: withdrawResult.account, depositResult: depositResult.account },
        };
        // TODO: Redesign - enqueueExecutedTransaction(result);
        return result;
      }
    }
    return { accounts: { withdrawResult: withdrawResult?.account, depositResult: depositResult?.account } };
  } catch (error) {
    await pgClient.query('ROLLBACK');
    console.error('Error during transfer', error);
    throw error;
  } finally {
    if (pgClient) pgClient.release();
  }
});

// Get transactions for an account
const getTransactions = logMiddleware('getTransactions')(async (account_id, tenant_id) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      'SELECT id,executed_at,transaction FROM accountTransactions WHERE account_id = $1 AND tenant_id = $2 ORDER BY executed_at DESC',
      [account_id, tenant_id]
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
    if (pgClient) pgClient.release();
  }
});

// Log a transaction in the accountTransactions table
// @param {string} id - The ID of the transaction. If not provided, a new UUID will be generated.
// @param {string} tenant_id - The ID of the tenant.
// @param {string} account_id - The ID of the account.
// @param {object} transactionData - The data of the transaction.
const logTransaction = logMiddleware('logTransaction')(async (id, tenant_id, account_id, transactionData) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      'INSERT INTO accountTransactions (id,tenant_id,account_id,transaction,executed_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
      [id ?? uuidv4(), tenant_id, account_id, JSON.stringify(transactionData)]
    );
    return result.rows[0].id;
  } catch (error) {
    console.error('Error logging transaction', error);
    throw error;
  } finally {
    if (pgClient) pgClient.release();
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
  deleteAccount,
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
};
