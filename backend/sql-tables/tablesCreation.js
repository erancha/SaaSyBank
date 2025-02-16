const { Client } = require('pg');

exports.handler = async (event) => {
  const dbName = process.env.DB_NAME;
  const clientParams = {
    host: process.env.RDS_ENDPOINT,
    database: 'postgres',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false,
    },
  };

  // Define temporary user ID for testing
  const TEMP_USER_ID = '43e4c8a2-4081-70d9-613a-244f8f726307';
  const TEMP_USER_NAME = 'Betty User';
  const TEMP_USER_EMAIL = 'bettyuser100@gmail.com';

  const client = new Client(clientParams);
  let dbClient;

  try {
    await client.connect();

    // Check if database exists
    const dbExistsQuery = `SELECT 1 FROM pg_database WHERE datname = $1;`;
    const dbExistsResult = await client.query(dbExistsQuery, [dbName]);

    // Create database if it doesn't exist
    if (dbExistsResult.rowCount === 0) {
      const createDBQuery = `CREATE DATABASE ${dbName};`;
      await client.query(createDBQuery);
      console.log(`Database ${dbName} created.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }

    // Connect to the specific database
    await client.end();
    dbClient = new Client({ ...clientParams, database: dbName });
    await dbClient.connect();

    if (event.skipTablesCreation) {
      const accountsQuery = 'SELECT * FROM accounts;';
      const transactionsQuery = 'SELECT * FROM accountTransactions;';

      const accountsResult = await dbClient.query(accountsQuery);
      const transactionsResult = await dbClient.query(transactionsQuery);

      // Format transactions by parsing the BYTEA data
      const formattedTransactions = transactionsResult.rows.map((row) => ({
        ...row,
        transaction: JSON.parse(row.transaction.toString()), // Convert BYTEA to string and parse JSON
      }));

      console.log('Current accounts records:', JSON.stringify(accountsResult.rows, null, 2));
      console.log('Current transactions records:', JSON.stringify(formattedTransactions, null, 2));
    } else {
      // Drop existing tables if requested
      if (event.dropTables) {
        const dropTablesQuery = `
        DROP TABLE IF EXISTS accounts;
        DROP TABLE IF EXISTS accountTransactions;
        DROP TABLE IF EXISTS users;
      `;
        await dbClient.query(dropTablesQuery);
        console.log('Existing tables dropped.');
      }

      // Create tables and index
      const createTableQueries = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            user_name TEXT NOT NULL,
            email_address TEXT NOT NULL UNIQUE,
            tenant_id TEXT NOT NULL,
            is_disabled BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL,
            tenant_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            -- REFERENCES constraint creates a foreign key that ensures user_id exists in users table
            -- This enforces referential integrity - you cannot create an account for a non-existent user
            user_id TEXT NOT NULL REFERENCES users(user_id),
            is_disabled BOOLEAN NULL,
            balance DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (tenant_id, account_id)
        );

        CREATE TABLE IF NOT EXISTS accountTransactions (
            id UUID DEFAULT uuid_generate_v4(),
            tenant_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            transaction BYTEA NOT NULL,
            encryptedTransaction BYTEA,
            PRIMARY KEY (tenant_id, account_id, id)
        );
      `;
      await dbClient.query(createTableQueries);

      // Insert the temporary user
      const insertUserQuery = `
        INSERT INTO users (user_id, user_name, email_address, tenant_id) 
        VALUES ('${TEMP_USER_ID}', '${TEMP_USER_NAME}', '${TEMP_USER_EMAIL}', '${process.env.TENANT_ID}')
        ON CONFLICT (user_id) DO NOTHING;
      `;
      await dbClient.query(insertUserQuery);

      // Check if the index exists and create it if it does not
      const indexCheckQuery = `
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'accounts' AND indexname = 'idx_user_id') THEN
                CREATE INDEX idx_user_id ON accounts(user_id);
            END IF;
        END $$;
      `;
      await dbClient.query(indexCheckQuery);
      console.log('Tables and index created.');
    }

    const TEMP_TENANT_ID = 'temp-tenant';
    const TEMP_ACCOUNT_ID = 'account123';

    // Add a record
    const addAccountRecordQuery = `
      INSERT INTO accounts (tenant_id, account_id, user_id, balance) 
      VALUES ($1, $2, $3, $4);
    `;
    await dbClient.query(addAccountRecordQuery, [TEMP_TENANT_ID, TEMP_ACCOUNT_ID, TEMP_USER_ID, 100.0]);

    // Display records count
    const countQuery1 = 'SELECT COUNT(*) FROM accounts;';
    const countResult1 = await dbClient.query(countQuery1);
    console.log('Account records count after addition:', countResult1.rows[0].count);

    // Delete the record
    const deleteRecordQuery = `
        DELETE FROM accounts 
        WHERE account_id = $1;
      `;
    await dbClient.query(deleteRecordQuery, [TEMP_ACCOUNT_ID]);

    // Get final counts
    const countQuery2 = 'SELECT COUNT(*) FROM accounts;';
    const countResult2 = await dbClient.query(countQuery2);
    const finalAccountRecordsCount = countResult2.rows[0].count;
    console.log('Account records count after deletion:', finalAccountRecordsCount);
    const countQuery3 = 'SELECT COUNT(*) FROM accountTransactions;';
    const countResult3 = await dbClient.query(countQuery3);
    const finalAccountTransactionsRecordsCount = countResult3.rows[0].count;

    return {
      statusCode: 200,
      body: JSON.stringify(
        `Database checked/created, ${
          !event.skipTablesCreation ? 'table created, ' : ''
        }record added, and deleted successfully. Current records counts: ${finalAccountRecordsCount} accounts, ${finalAccountTransactionsRecordsCount} transactions.`
      ),
    };
  } catch (error) {
    console.error('Error during database operations:', error);
    return {
      statusCode: 500,
      body: JSON.stringify('Failed to perform database operations: ' + error.message),
    };
  } finally {
    await client.end();
    if (dbClient) {
      await dbClient.end();
    }
  }
};
