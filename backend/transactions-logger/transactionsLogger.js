const { Client } = require('pg'); // PostgreSQL client
// const { getUserDataKey, encrypt } = require('encryption-submodule/encryption');

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

  const consoleLog = (message) => {}; // console.log(message); //
  try {
    consoleLog(`${event.Records.length} records to process. Connecting to pg ... ${JSON.stringify(dbParams)}`);
    await dbClient.connect();
    consoleLog('Connected to pg.');

    //  const userDataKey = getUserDataKey('23743842-4061-709b-44f8-4ef9a527509d'); // erancha .. once authentication will be implemented (TODO), transactions of each users will be encrypted by his/her own key.

    for (const record of event.Records) {
      try {
        // record.body:
        // {
        //    "path": "/deposit",
        //    "body": {
        //       "amount": 1000,
        //       "accountId": "d40a84fd-0661-4456-a4d8-a62cc619c628",
        //       "tenantId": "tenant1"
        //    }
        // }
        consoleLog(`record.body: ${record.body}`);
        const { accountId, tenantId } = JSON.parse(record.body).body;
        if (!tenantId) {
          console.error('Invalid record data, tenantId not found!', record.body);
          // Consider sending to dead-letter queue
          continue;
        } else {
          if (!accountId) {
            // For transfer the function inserts two records - one for the auditing of the 'fromAccount', and one for the 'toAccount':
            const { fromAccountId, toAccountId } = JSON.parse(record.body).body;
            if (!fromAccountId || !toAccountId) {
              console.error('Invalid record data, fromAccountId|toAccountId not found!', record.body);
            } else {
              const encryptedTransactionData = record.body; // await encrypt(userDataKey, record.body);
              consoleLog({ tenantId, fromAccountId, toAccountId, encryptedTransactionData });
              await dbClient.query('INSERT INTO accountTransactions (tenant_id, account_id, transaction) VALUES ($1, $2, $3) RETURNING *', [
                tenantId,
                fromAccountId,
                encryptedTransactionData,
              ]);

              await dbClient.query('INSERT INTO accountTransactions (tenant_id, account_id, transaction) VALUES ($1, $2, $3) RETURNING *', [
                tenantId,
                toAccountId,
                encryptedTransactionData,
              ]);
            }
            continue;
          }
        }

        const encryptedTransactionData = record.body; // await encrypt(userDataKey, record.body);
        consoleLog({ tenantId, accountId, encryptedTransactionData });
        await dbClient.query('INSERT INTO accountTransactions (tenant_id, account_id, transaction) VALUES ($1, $2, $3) RETURNING *', [
          tenantId,
          accountId,
          encryptedTransactionData,
        ]);
      } catch (recordError) {
        console.error(`Error processing individual record: ${recordError}`);
        // Consider sending to dead-letter queue
      }
    }
  } catch (error) {
    console.error(`Database connection or processing error: ${error}`);
  } finally {
    await dbClient.end();
  }
};
