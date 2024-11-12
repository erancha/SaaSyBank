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
      rejectUnauthorized: false, // TODO: Use this only for development; set to true in production.
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

    // Create table(s)
    const createTableQuery = `
            CREATE TABLE IF NOT EXISTS accounts (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                balance DECIMAL(10, 2) NOT NULL
            );
        `;

    await dbClient.query(createTableQuery);

    const TENANT_ID = 'tenant1';
    const ACCOUNT_ID = 'account123';
    const newLocal = `
            INSERT INTO accounts (tenant_id,account_id, balance) 
            VALUES ('${TENANT_ID}', '${ACCOUNT_ID}', 100.00);
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
    const finalRecordsCount = countResult2.rows[0].count;
    console.log('Records count after deletion:', finalRecordsCount);

    return {
      statusCode: 200,
      body: JSON.stringify(
        `Database checked/created, table created, record added, and deleted successfully. Current records count: ${finalRecordsCount}.`
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
