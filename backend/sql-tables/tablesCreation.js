const { Client } = require('pg'); // PostgreSQL client

exports.handler = async (event) => {
  const dbName = process.env.DB_NAME;
  const clientParams = {
    host: process.env.RDS_ENDPOINT,
    database: 'postgres',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false, // TODO: Handle SSL before production!
    },
  };

  const client = new Client(clientParams);
  let dbClient; // Declare dbClient here for access in finally block

  try {
    // Connect to the PostgreSQL server (not a specific database)
    await client.connect();

    // Check if the database exists
    const dbExistsQuery = `SELECT 1 FROM pg_database WHERE datname = $1;`;
    console.log({ dbExistsQuery });
    const dbExistsResult = await client.query(dbExistsQuery, [dbName]);

    // If the database does not exist, create it
    if (dbExistsResult.rowCount === 0) {
      const createDBQuery = `CREATE DATABASE ${dbName};`;
      await client.query(createDBQuery);
      console.log(`Database ${dbName} created.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }

    // Now connect to the specific database
    await client.end(); // First, end the previous connection
    dbClient = new Client({ ...clientParams, database: dbName }); // Initialize dbClient

    await dbClient.connect();

    // Drop existing tables if event.dropTables is true
    if (event.dropTables) {
      const dropTablesQuery = `
        DROP TABLE IF EXISTS accounts;
        DROP TABLE IF EXISTS accountTransactions;
      `;
      await dbClient.query(dropTablesQuery);
      console.log('Existing tables dropped.');
    }

    // Create table(s)
    const createTableQueries = `
      CREATE TABLE IF NOT EXISTS accounts (
          id SERIAL,
          tenant_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          is_disabled BOOLEAN NULL,
          balance DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (tenant_id, account_id)
      );

      CREATE TABLE IF NOT EXISTS accountTransactions (
          id SERIAL,
          tenant_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          transaction BYTEA NOT NULL,
          PRIMARY KEY (tenant_id, account_id, id)
      );
    `;

    await dbClient.query(createTableQueries);

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

    console.log('Tables created.');

    const TENANT_ID = 'temp-tenant';
    const ACCOUNT_ID = 'account123';
    const USER_ID = '43e4c8a2-4081-70d9-613a-244f8f726307'; // bettyuser100@gmail.com
    const newLocal = `
            INSERT INTO accounts (tenant_id,account_id,user_id,balance) 
            VALUES ('${TENANT_ID}', '${ACCOUNT_ID}', '${USER_ID}', 100.00);
        `;
    // 1. Add a record
    const addRecordQuery = newLocal;
    await dbClient.query(addRecordQuery);

    // 2. Display records count
    const countQuery1 = 'SELECT COUNT(*) FROM accounts;';
    const countResult1 = await dbClient.query(countQuery1);
    console.log('Records count after addition:', countResult1.rows[0].count);

    // 3. Delete the record
    const deleteRecordQuery = `
            DELETE FROM accounts 
            WHERE account_id = '${ACCOUNT_ID}';
        `;
    await dbClient.query(deleteRecordQuery);

    // 4. Display records count again
    const countQuery2 = 'SELECT COUNT(*) FROM accounts;';
    const countResult2 = await dbClient.query(countQuery2);
    const finalAccountRecordsCount = countResult2.rows[0].count;
    console.log('Records count after deletion:', finalAccountRecordsCount);
    const countQuery3 = 'SELECT COUNT(*) FROM accountTransactions;';
    const countResult3 = await dbClient.query(countQuery3);
    const finalAccountTransactionsRecordsCount = countResult3.rows[0].count;

    return {
      statusCode: 200,
      body: JSON.stringify(
        `Database checked/created, table created, record added, and deleted successfully. Current records counts: ${finalAccountRecordsCount} accounts, ${finalAccountTransactionsRecordsCount} transactions.`
      ),
    };
  } catch (error) {
    console.error('Error during database operations:', error);
    return {
      statusCode: 500,
      body: JSON.stringify('Failed to perform database operations: ' + error.message),
    };
  } finally {
    // Ensure both clients are properly closed
    await client.end();
    if (dbClient) {
      await dbClient.end(); // Close dbClient safely
    }
  }
};
