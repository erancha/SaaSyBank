const { Pool } = require('pg');

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
    if (process.env.ENABLE_ENHANCED_LOGGING) {
      console.log(`Calling function: ${fn.name} with parameters: ${JSON.stringify(args)}`);
    }
    return await fn(...args);
  };
  wrappedFunction.name = fn.name;
  return wrappedFunction;
};

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
    return result;
  } catch (error) {
    console.error('Error creating account', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

const setAccountState = logMiddleware(async (accountId, is_disabled, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query(
      `
      UPDATE accounts 
      SET is_disabled = $3, updated_at = NOW() 
      WHERE account_id = $1 AND tenant_id = $2 
      RETURNING *`,
      [accountId, tenantId, is_disabled]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error enabling account', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

const deleteAccount = logMiddleware(async (accountId, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query(
      `
      DELETE FROM accounts 
      WHERE account_id = $1 AND tenant_id = $2 
      RETURNING *`,
      [accountId, tenantId]
    );

    if (result.rowCount === 0) {
      throw new Error('Account not found');
    }

    return result.rows[0]; // Return the deleted account details
  } catch (error) {
    console.error('Error deleting account', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

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

const getAccountBalance = logMiddleware(async (tenantId, accountId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query('SELECT balance FROM accounts WHERE account_id = $1 AND tenant_id = $2', [accountId, tenantId]);
    return result;
  } catch (error) {
    console.error('Error getting balance', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

const deposit = logMiddleware(async (amount, accountId, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query('UPDATE accounts SET balance = balance + $1 WHERE account_id = $2 AND tenant_id = $3 RETURNING *', [
      amount,
      accountId,
      tenantId,
    ]);
    return result;
  } catch (error) {
    console.error('Error during deposit', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

const withdraw = logMiddleware(async (amount, accountId, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query('UPDATE accounts SET balance = balance - $1 WHERE account_id = $2 AND tenant_id = $3 RETURNING *', [
      amount,
      accountId,
      tenantId,
    ]);
    return result;
  } catch (error) {
    console.error('Error during withdrawal', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

const transfer = logMiddleware(async (amount, fromAccountId, toAccountId, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    await pgClient.query('BEGIN');

    const withdrawResult = await withdraw(amount, fromAccountId, tenantId);
    if (withdrawResult.rowCount === 0) {
      await pgClient.query('ROLLBACK');
      throw new Error('From account not found or Insufficient funds');
    }

    const depositResult = await deposit(amount, toAccountId, tenantId);
    if (depositResult.rowCount === 0) {
      await pgClient.query('ROLLBACK');
      throw new Error('To account not found');
    }

    await pgClient.query('COMMIT');
    return { withdrawResult, depositResult };
  } catch (error) {
    await pgClient.query('ROLLBACK');
    console.error('Error during transfer', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

const getAccountTransactions = logMiddleware(async (accountId, tenantId) => {
  const pgClient = await pgPool.connect();
  try {
    const result = await pgClient.query('SELECT * FROM accountTransactions WHERE account_id = $1 AND tenant_id = $2', [accountId, tenantId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting transactions', error);
    throw error; // Rethrow the error
  } finally {
    pgClient.release();
  }
});

async function disposeClient() {
  if (pgPool) await pgPool.end();
}

module.exports = {
  createAccount,
  setAccountState,
  getAllAccounts,
  getAccountsByUserId,
  getAccountTransactions,
  getAccountBalance,
  deposit,
  withdraw,
  transfer,
  healthCheck,
  disposeClient,
  deleteAccount,
};
