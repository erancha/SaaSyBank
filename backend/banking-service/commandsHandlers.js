const { CURRENT_TASK_ID } = require('./constants');
const dbData = require('./dbData');

// Middleware for logging parameters
const logMiddleware = (name) => (fn) => {
  const wrappedFunction = async function (...args) {
    if (process.env.ENABLE_ENHANCED_LOGGING.toLowerCase() === 'true') {
      console.log(`Calling function: ${name} with parameters: ${JSON.stringify(args)}`);
    }
    return await fn(...args);
  };
  wrappedFunction.name = name;
  return wrappedFunction;
};

// Helper function for logging task messages
const logTaskMessage = (type, data) => {
  const formattedData = process.env.ENABLE_ENHANCED_LOGGING.toLowerCase() === 'true' ? JSON.stringify(data, null, 2) : JSON.stringify(data).substring(0, 600);
  console.log(`Task ${CURRENT_TASK_ID}: ${type} ${formattedData}.`);
};

// Main command handler
const handleCommand = logMiddleware('handleCommand')(async function ({ commandType, commandParams, connectedUserId }) {
  let response;

  logTaskMessage('Request', { commandType, commandParams, connectedUserId });

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

  logTaskMessage('Response', response);

  return response;
});

// Command handler to create a record
async function handleCreate({ commandParams, connectedUserId }) {
  let response; // to the client socket

  if (commandParams.accounts) {
    const { account_id, balance } = commandParams.accounts;
    response = { accounts: await dbData.createAccount(account_id, balance, connectedUserId, process.env.TENANT_ID) };
  } else if (commandParams.transactions) {
    const { id, bankingFunction, amount, account_id, to_account_id } = commandParams.transactions;
    switch (bankingFunction) {
      case 'deposit':
        dbResult = await dbData.deposit(id, amount, account_id, process.env.TENANT_ID);
        break;
      case 'withdraw':
        dbResult = await dbData.withdraw(id, amount, account_id, process.env.TENANT_ID);
        break;
      case 'transfer':
        dbResult = await dbData.transfer(id, amount, account_id, to_account_id, process.env.TENANT_ID);
        break;
      default:
        throw 'Unknown banking function!';
    }
    response = { transactions: dbResult };
  }

  if (response) return { dataCreated: response };
}

// Command handler to read records
const handleRead = logMiddleware('handleRead')(async function ({ commandParams, connectedUserId }) {
  let response; // to the client socket

  if (commandParams.accounts) {
    const dbResult = commandParams.accounts.all
      ? await dbData.getAllAccounts(process.env.TENANT_ID) /* handle pagination */
      : await dbData.getAccountsByUserId(connectedUserId, process.env.TENANT_ID);
    response = { accounts: dbResult || [] };
  }
  if (commandParams.transactions) {
    let account_id = commandParams.transactions.account_id;
    if (!account_id && response?.accounts.length > 0 && commandParams.transactions.fromFirstAccount) account_id = response.accounts[0].account_id;
    if (account_id) response = { ...response, transactions: await dbData.getTransactions(account_id, process.env.TENANT_ID) };
  }

  if (response) return { dataRead: { ...response } };
});

// Command handler to update a record
async function handleUpdate({ commandParams }) {
  let response; // to the client socket

  if (commandParams.accounts) {
    const { account_id, is_disabled } = commandParams.accounts;
    response = { accounts: await dbData.setAccountState(account_id, is_disabled, process.env.TENANT_ID) };
  }

  if (response) return { dataUpdated: response };
}

// Command handler to delete a record
async function handleDelete({ commandParams }) {
  let response; // to the client socket

  if (commandParams.accounts) {
    const { account_id } = commandParams.accounts;
    response = { accounts: await dbData.deleteAccount(account_id, process.env.TENANT_ID) };
  }

  if (response) return { dataDeleted: response };
}

module.exports = { handleCommand, handleRead };
