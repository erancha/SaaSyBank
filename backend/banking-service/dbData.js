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

const connect = async () => {
  const client = await pgPool.connect();
  return client;
};

const healthCheck = async () => {
  const client = await connect();
  try {
    const now = await client.query('SELECT NOW()');
    return now.rows[0].now;
  } finally {
    client.release();
  }
};

const createAccount = async (accountId, initialBalance, tenantId) => {
  const client = await connect();
  try {
    const result = await client.query(
      `
      INSERT INTO accounts (account_id, balance, tenant_id) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (account_id, tenant_id) DO NOTHING 
      RETURNING *`,
      [accountId, initialBalance, tenantId]
    );
    return result;
  } finally {
    client.release();
  }
};

const listAccounts = async (tenantId) => {
  const client = await connect();
  try {
    const result = await client.query('SELECT account_id, balance FROM accounts WHERE tenant_id = $1', [tenantId]);
    return result;
  } finally {
    client.release();
  }
};

const getBalance = async (tenantId, accountId) => {
  const client = await connect();
  try {
    const result = await client.query('SELECT balance FROM accounts WHERE account_id = $1 AND tenant_id = $2', [accountId, tenantId]);
    return result;
  } finally {
    client.release();
  }
};

const deposit = async (amount, accountId, tenantId) => {
  const client = await connect();
  try {
    const result = await client.query('UPDATE accounts SET balance = balance + $1 WHERE account_id = $2 AND tenant_id = $3 RETURNING *', [
      amount,
      accountId,
      tenantId,
    ]);
    return result;
  } finally {
    client.release();
  }
};

const withdraw = async (amount, accountId, tenantId) => {
  const client = await connect();
  try {
    const result = await client.query('UPDATE accounts SET balance = balance - $1 WHERE account_id = $2 AND tenant_id = $3 RETURNING *', [
      amount,
      accountId,
      tenantId,
    ]);
    return result;
  } finally {
    client.release();
  }
};

const transfer = async (amount, fromAccountId, toAccountId, tenantId) => {
  const client = await connect();
  try {
    await client.query('BEGIN');

    const withdrawResult = await withdraw(amount, fromAccountId, tenantId);
    if (withdrawResult.rowCount === 0) {
      await client.query('ROLLBACK');
      throw new Error('From account not found or Insufficient funds');
    }

    const depositResult = await deposit(amount, toAccountId, tenantId);
    if (depositResult.rowCount === 0) {
      await client.query('ROLLBACK');
      throw new Error('To account not found');
    }

    await client.query('COMMIT');
    return { withdrawResult, depositResult };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

async function getAllTransactions(accountId, tenantId) {
  const client = await pgPool.connect();
  try {
    const result = await client.query('SELECT * FROM accountTransactions WHERE account_id = $1 AND tenant_id = $2', [accountId, tenantId]);
    return result.rows;
  } finally {
    client.release();
  }
}

async function disposeClient() {
  if (pgPool) await pgPool.end();
}

module.exports = {
  healthCheck,
  createAccount,
  listAccounts,
  getBalance,
  deposit,
  withdraw,
  transfer,
  getAllTransactions,
  disposeClient,
};
