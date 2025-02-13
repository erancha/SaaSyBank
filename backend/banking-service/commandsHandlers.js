const { CURRENT_TASK_ID } = require('./constants');
const dbData = require('./dbData');

// Middleware for logging parameters
const logMiddleware = (fn) => {
  const wrappedFunction = async function (...args) {
    if (process.env.ENABLE_ENHANCED_LOGGING.toLowerCase() === 'true') {
      console.log(`Calling function: ${fn.name} with parameters: ${JSON.stringify(args)}`);
    }
    return await fn(...args);
  };
  wrappedFunction.name = fn.name;
  return wrappedFunction;
};

// Main command handler
const handleCommand = logMiddleware(async function ({ commandType, commandParams, connectedUserId, commandClientSocket }) {
  let response;

  switch (commandType) {
    case 'create':
      response = await handleCreate({ commandParams, connectedUserId });
      break;

    case 'read':
      response = await handleRead({ commandParams, connectedUserId });
      break;

    case 'update':
      response = await handleUpdate({ commandParams });
      break;

    case 'delete':
      response = await handleDelete({ commandParams });
      break;

    default:
      throw 'Unknown command type!';
  }

  writeResponse({ response, responseSocket: commandClientSocket });
});

// Command handler to create a record
async function handleCreate({ commandParams, connectedUserId }) {
  let response; // to the client socket

  if (commandParams.account) {
    const { account_id, balance } = commandParams.account;
    response = { account: await dbData.createAccount(account_id, balance, connectedUserId, process.env.TENANT_ID) };
  } else if (commandParams.transaction) {
    const { bankingFunction, amount, accountId, toAccountId } = commandParams.transaction;
    switch (bankingFunction) {
      case 'deposit':
        dbResult = (await dbData.deposit(amount, accountId, process.env.TENANT_ID))[0];
        break;
      case 'withdraw':
        dbResult = (await dbData.withdraw(amount, accountId, process.env.TENANT_ID))[0];
        break;
      case 'transfer':
        const transferResult = await dbData.transfer(amount, accountId, toAccountId, process.env.TENANT_ID);
        dbResult = { withdrawResult: transferResult.withdrawResult[0], depositResult: transferResult.depositResult[0] };
        break;
      default:
        throw 'Unknown banking function!';
    }
    response = { transaction: { account: dbResult } };
  }

  if (response) return { dataCreated: { ...response } };
}

// Command handler to read records
const handleRead = logMiddleware(async function ({ commandParams, connectedUserId }) {
  let response; // to the client socket

  if (commandParams.accounts) {
    const dbResult = commandParams.accounts.all ? await dbData.getAllAccounts(process.env.TENANT_ID) : await dbData.getAccountsByUserId(connectedUserId);
    response = { accounts: dbResult || [] };
  }
  if (commandParams.transactions) {
    let accountId = commandParams.transactions.accountId;
    if (!accountId && response?.accounts.length > 0) {
      const firstReadAccount = response.accounts.find((account) => account.user_id === connectedUserId);
      if (firstReadAccount) accountId = firstReadAccount.account_id;
    }
    if (accountId) {
      const transactions = await dbData.getTransactions(accountId, process.env.TENANT_ID);
      response = { ...response, transactions };
    }
  }

  if (response) return { dataRead: { ...response } };
});

// Command handler to update a record
async function handleUpdate({ commandParams }) {
  let response; // to the client socket

  if (commandParams.account) {
    const { account_id, is_disabled } = commandParams.account;
    response = { account: await dbData.setAccountState(account_id, is_disabled, process.env.TENANT_ID) };
  }
  // } else if (commandParams.transaction) {

  if (response) return { dataUpdated: { ...response } };
}

// Command handler to delete a record
async function handleDelete({ commandParams }) {
  let response; // to the client socket

  if (commandParams.account) {
    const { account_id } = commandParams.account;
    response = { account: await dbData.deleteAccount(account_id, process.env.TENANT_ID) };
  }

  if (response) return { dataDeleted: { ...response } };
}

// Helper function to write a response to the client
function writeResponse({ response, responseSocket }) {
  if (response) {
    if (responseSocket) responseSocket.send(JSON.stringify(response));
    console.log(
      `Task ${CURRENT_TASK_ID}: Response ${
        process.env.ENABLE_ENHANCED_LOGGING.toLowerCase() === 'true' ? JSON.stringify(response, null, 2) : JSON.stringify(response).substring(0, 500)
      }${responseSocket ? ' sent to the client' : ''}.`
    );
  } else throw `Task ${CURRENT_TASK_ID}: No response was prepared!`;
}

module.exports = { handleCommand, handleRead, writeResponse };
