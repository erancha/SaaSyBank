const { Client } = require('pg'); // PostgreSQL client
// const { getUserDataKey, encrypt } = require('encryption-submodule/encryption');

//=============================================================================================================
// Handler to process records from an SQS queue (by event source mapping) and encrypt transaction data
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

  try {
    await dbClient.connect();
    console.log(`${event.Records.length} records to process.`);

    for (const record of event.Records) {
      try {
        const { bankingFunction, tenant_id } = JSON.parse(record.body);
        if (!bankingFunction || !tenant_id) {
          console.error('Invalid record: bankingFunction or tenant_id not found!', record.body);
          continue;
        }

        const encryptedTransactionData = record.body; // await encrypt(userDataKey, record.body);

        if (bankingFunction !== 'transfer') {
          const { account_id } = JSON.parse(record.body);
          if (!account_id) {
            console.error('Invalid record: account_id not found!', record.body);
            continue;
          }

          await dbClient.query('UPDATE accountTransactions SET encryptedTransaction = $1 WHERE tenant_id = $2 AND account_id = $3 AND transaction = $4', [
            encryptedTransactionData,
            tenant_id,
            account_id,
            record.body,
          ]);
          console.log(`Updated encrypted transaction: ${tenant_id} ${account_id}`);
        } else {
          const { fromAccountId, to_account_id } = JSON.parse(record.body);
          if (!fromAccountId || !to_account_id) {
            console.error('Invalid record: fromAccountId or to_account_id not found!', record.body);
            continue;
          }

          await dbClient.query('UPDATE accountTransactions SET encryptedTransaction = $1 WHERE tenant_id = $2 AND account_id = $3 AND transaction = $4', [
            encryptedTransactionData,
            tenant_id,
            fromAccountId,
            record.body,
          ]);
          console.log(`Updated encrypted transaction: ${tenant_id} ${fromAccountId}`);

          await dbClient.query('UPDATE accountTransactions SET encryptedTransaction = $1 WHERE tenant_id = $2 AND account_id = $3 AND transaction = $4', [
            encryptedTransactionData,
            tenant_id,
            to_account_id,
            record.body,
          ]);
          console.log(`Updated encrypted transaction: ${tenant_id} ${to_account_id}`);
        }
      } catch (recordError) {
        console.error(`Error processing a record: ${record.body}:`, recordError);
      }
    }
  } catch (error) {
    console.error('Database connection or processing error:', error);
  } finally {
    await dbClient.end();
  }
};
