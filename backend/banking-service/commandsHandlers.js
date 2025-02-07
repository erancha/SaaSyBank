const { CURRENT_TASK_ID } = require('./constants');
const dbData = require('./dbData');

// Middleware for logging parameters
const logMiddleware = (fn) => {
  const wrappedFunction = async function (...args) {
    if (process.env.ENABLE_ENHANCED_LOGGING) {
      console.log(`Calling function: ${fn.name} with parameters: ${JSON.stringify(args)}`);
    }
    return await fn(...args);
  };
  wrappedFunction.name = fn.name;
  return wrappedFunction;
};

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

async function handleCreate({ commandParams, connectedUserId }) {
  let response; // to the client socket

  if (commandParams.account) {
    const { account_id, balance } = commandParams.account;
    response = { account: await dbData.createAccount(account_id, balance, connectedUserId, process.env.TENANT_ID) };
  }

  if (response) return { dataCreated: { ...response } };
}

const handleRead = logMiddleware(async function ({ commandParams, connectedUserId }) {
  let response; // to the client socket

  if (commandParams.accounts) {
    const dbResult = commandParams.accounts.all ? await dbData.getAllAccounts(process.env.TENANT_ID) : await dbData.getAccountsByUserId(connectedUserId);
    response = { accounts: dbResult || [] };
  } else if (commandParams.transactions) {
    const dbResult = await dbData.getAccountTransactions(commandParams.transactions.accountId, process.env.TENANT_ID);
    response = { transactions: dbResult.rows || [] };
  }

  if (response) return { dataRead: { ...response } };
});

async function handleUpdate({ commandParams }) {
  let response; // to the client socket

  if (commandParams.account) {
    const { account_id, is_disabled } = commandParams.account;
    response = { account: await dbData.setAccountState(account_id, is_disabled, process.env.TENANT_ID) };
  }

  if (response) return { dataUpdated: { ...response } };
}

async function handleDelete({ commandParams }) {
  let response; // to the client socket

  if (commandParams.account) {
    const { account_id } = commandParams.account;
    response = { account: await dbData.deleteAccount(account_id, process.env.TENANT_ID) };
  }

  if (response) return { dataDeleted: { ...response } };
}

function writeResponse({ response, responseSocket }) {
  if (response) {
    if (responseSocket) responseSocket.send(JSON.stringify(response));
    if (process.env.ENABLE_ENHANCED_LOGGING)
      console.log(`Task ${CURRENT_TASK_ID}: Response ${JSON.stringify(response, null, 2)}${responseSocket ? ' sent to the client' : ''}.`);
  } else throw `Task ${CURRENT_TASK_ID}: No response was prepared!`;
}

module.exports = { handleCommand, handleRead, writeResponse };
