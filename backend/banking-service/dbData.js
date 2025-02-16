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

// Insert or update user
const insertUser = logMiddleware('insertUser')(async (userId, userName, email, tenantId) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      `INSERT INTO users (user_id, user_name, email_address, tenant_id) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE 
       SET user_name = $2, email_address = $3, tenant_id = $4
       RETURNING user_id, user_name, email_address, tenant_id`,
      [userId, userName, email, tenantId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error in insertUser:', error);
    throw error;
  } finally {
    if (pgClient) pgClient.release();
  }
});

// Get all users
const getAllUsers = logMiddleware('getAllUsers')(async (tenantId) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      `SELECT user_id, user_name, email_address 
       FROM users 
       WHERE tenant_id = $1 
       ORDER BY user_name`,
      [tenantId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error in getAllUsers:', error);
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

// Get all accounts with user information
const getAllAccounts = logMiddleware('getAllAccounts')(async (tenant_id) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      // INNER JOIN (default JOIN) only returns records that have matching values in both tables
      // Example: If account.user_id = 'A' and users table doesn't have user_id 'A', the account won't be returned
      `SELECT a.account_id, a.user_id, u.user_name, a.balance, a.is_disabled, a.created_at, a.updated_at 
       FROM accounts a 
       JOIN users u ON a.user_id = u.user_id 
       WHERE a.tenant_id = $1 
       ORDER BY a.updated_at DESC`,
      [tenant_id]
    );
    return result.rows;
  } catch (error) {
    console.error('Error in getAllAccounts:', error);
    throw error;
  } finally {
    if (pgClient) pgClient.release();
  }
});

// Get accounts by user ID
const getAccountsByUserId = logMiddleware('getAccountsByUserId')(async (user_id, tenant_id) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    const result = await pgClient.query(
      `SELECT account_id, balance, is_disabled
       FROM accounts 
       WHERE user_id = $1 AND tenant_id = $2
       ORDER BY updated_at DESC`,
      [user_id, tenant_id]
    );
    return result.rows;
  } catch (error) {
    console.error('Error in getAccountsByUserId:', error);
    throw error;
  } finally {
    if (pgClient) pgClient.release();
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
const getAllAccountsByUserId = logMiddleware('getAllAccountsByUserId')(async (tenant_id, requiredFields = ['account_id'], onlyEnabled = true) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();

    // Validate required fields, Ensure account_id is always included
    const validFields = ['account_id', 'balance', 'is_disabled', 'created_at', 'updated_at'];
    const fields = requiredFields.filter((field) => validFields.includes(field));
    if (!fields.includes('account_id')) fields.unshift('account_id');

    // Build the json_build_object string for the selected fields
    const fieldSelections = fields.map((field) => `'${field}', a.${field}`).join(',\n          ');

    // Get users with their accounts. Supports:
    // 1. Field selection (always includes account_id)
    // 2. Filter out disabled accounts (onlyEnabled)
    // 3. Skip users with no valid accounts (EXISTS)
    // 4. Return [] instead of null for empty accounts (COALESCE)
    const result = await pgClient.query(
      `SELECT json_build_object(
        'user_id', u.user_id,
        'user_name', u.user_name,
        'accounts', COALESCE( -- Like ?? in JS: returns first non-null value. If json_agg returns null (no rows), use '[]'
          (
            SELECT json_agg(
              json_build_object(
                ${fieldSelections}
              ) ORDER BY a.created_at DESC
            )
            FROM accounts a 
            WHERE a.user_id = u.user_id 
              AND a.tenant_id = $1
              ${onlyEnabled ? 'AND NOT a.is_disabled' : ''}
          ),
          '[]'
        )
      ) as user_accounts
      FROM users u
      WHERE u.tenant_id = $1
        AND EXISTS (
          SELECT 1 FROM accounts a 
          WHERE a.user_id = u.user_id 
            AND a.tenant_id = $1
            ${onlyEnabled ? 'AND NOT a.is_disabled' : ''}
        )
      ORDER BY u.user_name ASC`,
      [tenant_id]
    );
    return result.rows.map((row) => row.user_accounts);
  } catch (error) {
    console.error('Error in getAllAccountsByUserId:', error);
    throw error;
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
        const transactionDataForLog = { ...transactionData, account_id };
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
        const transactionDataForLog = { ...transactionData, account_id };
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

// Transfer (between two accounts)
const transfer = logMiddleware('transfer')(async (id, amount, account_id, to_account_id, tenant_id) => {
  let pgClient;
  try {
    pgClient = await pgPool.connect();
    await pgClient.query('BEGIN');
    let depositResult;
    const withdrawResult = await withdraw(undefined, amount, account_id, tenant_id, false, pgClient);
    if (!withdrawResult) await pgClient.query('ROLLBACK');
    else {
      depositResult = await deposit(undefined, amount, to_account_id, tenant_id, false, pgClient);
      if (!depositResult) await pgClient.query('ROLLBACK');
      else {
        const transactionData = { bankingFunction: 'transfer', amount, account_id, to_account_id };
        const transactionDataForLog = { ...transactionData };
        const transactionId = await logTransaction(id, tenant_id, account_id, transactionDataForLog);
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

// Get all transactions for an account
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
  insertUser,
  getAllUsers,
  createAccount,
  deleteAccount,
  setAccountState,
  getAllAccounts,
  getAllAccountsByUserId,
  getAccountsByUserId,
  getTransactions,
  getAccountBalance,
  deposit,
  withdraw,
  transfer,
  healthCheck,
  disposeClient,
};
