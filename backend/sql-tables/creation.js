const { Client } = require('pg'); // PostgreSQL client

exports.handler = async (event) => {
  const client = new Client({
    user: process.env.DB_USERNAME,
    host: process.env.RDS_ENDPOINT,
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false, // Use this only for development; set to true in production.
    },
  });

  try {
    await client.connect();

    // Create table(s)
    const createTableQuery = `
            CREATE TABLE IF NOT EXISTS accounts (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                balance DECIMAL(10, 2) NOT NULL
            );
        `;

    await client.query(createTableQuery);

    // 1. Add a record
    const addRecordQuery = `
            INSERT INTO accounts (user_id, balance) 
            VALUES ('user123', 100.00);
        `;
    await client.query(addRecordQuery);

    // 2. Display records count
    const countQuery1 = 'SELECT COUNT(*) FROM accounts;';
    const countResult1 = await client.query(countQuery1);
    console.log('Records count after addition:', countResult1.rows[0].count);

    // 3. Delete the record
    const deleteRecordQuery = `
            DELETE FROM accounts 
            WHERE user_id = 'user123';
        `;
    await client.query(deleteRecordQuery);

    // 4. Display records count again
    const countQuery2 = 'SELECT COUNT(*) FROM accounts;';
    const countResult2 = await client.query(countQuery2);
    console.log('Records count after deletion:', countResult2.rows[0].count);

    return {
      statusCode: 200,
      body: JSON.stringify('Table created, record added, and deleted successfully!'),
    };
  } catch (error) {
    console.error('Error during database operations:', error);
    return {
      statusCode: 500,
      body: JSON.stringify('Failed to perform database operations'),
    };
  } finally {
    await client.end();
  }
};
