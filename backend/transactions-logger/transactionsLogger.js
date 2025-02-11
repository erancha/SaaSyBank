const { Client } = require('pg'); // PostgreSQL client
// const { getUserDataKey, encrypt } = require('encryption-submodule/encryption');

//=============================================================================================================
// Handler to process records from an SQS queue (by event source mapping) into a PG table 'accountTransactions'
//=============================================================================================================
exports.handler = async (event) => {
  if (!event.Records || event.Records.length === 0) {
    console.warn('No records to process.');
    return;
  }

  const dbParams = {
    host: process.env.RDS_ENDPOINT,
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false, // TODO: Handle SSL before production!
    },
  };
  const dbClient = new Client(dbParams);

  const consoleLog = (message) => {
    //console.log(message);
  };
  try {
    consoleLog(`${event.Records.length} records to process. Connecting to pg ... ${JSON.stringify(dbParams)}`);
    await dbClient.connect();
    consoleLog('Connected to pg.');

    //  const userDataKey = getUserDataKey('43e4c8a2-4081-70d9-613a-244f8f726307'); // bettyuser100@gmail.com

    for (const record of event.Records) {
      try {
        consoleLog(`record.body: ${record.body}`);
        const { bankingFunction, tenantId } = JSON.parse(record.body);
        if (!bankingFunction || !tenantId) console.error('Invalid record: bankingFunction or tenantId not found!', record.body);
        else {
          const encryptedTransactionData = record.body; // await encrypt(userDataKey, record.body);
          if (bankingFunction !== 'transfer') {
            const { accountId } = JSON.parse(record.body);
            if (!accountId) console.error('Invalid record: accountId not found!', record.body);
            else
              await dbClient.query('INSERT INTO accountTransactions (tenant_id,account_id,transaction,executed_at) VALUES ($1,$2,$3,NOW()) RETURNING *', [
                tenantId,
                accountId,
                encryptedTransactionData,
              ]);
          } else {
            const { fromAccountId, toAccountId } = JSON.parse(record.body);
            if (!fromAccountId || !toAccountId) console.error('Invalid record: fromAccountId or toAccountId not found!', record.body);
            else {
              await dbClient.query('INSERT INTO accountTransactions (tenant_id,account_id,transaction,executed_at) VALUES ($1,$2,$3,NOW()) RETURNING *', [
                tenantId,
                fromAccountId,
                encryptedTransactionData,
              ]);
              await dbClient.query('INSERT INTO accountTransactions (tenant_id,account_id,transaction,executed_at) VALUES ($1,$2,$3,NOW()) RETURNING *', [
                tenantId,
                toAccountId,
                encryptedTransactionData,
              ]);
            }
          }
        }
      } catch (recordError) {
        console.error(`Error processing a record: ${record.body}: ${recordError}`);
        // Consider sending to dead-letter queue
      }
    }
  } catch (error) {
    console.error(`Database connection or processing error: ${error}`);
  } finally {
    await dbClient.end();
  }
};
