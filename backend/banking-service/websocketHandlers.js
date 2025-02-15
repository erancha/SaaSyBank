const url = require('url');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { CURRENT_TASK_ID } = require('./constants');
const { handleCommand, handleRead } = require('./commandsHandlers');
const { getRedisClient, getPublisherClient, getSubscriberClient } = require('./redisClient');

// Refer to ./websockets-ecs.png
// -----------------------------
const CONNECTED_USERS_TO_TASKS_IDS_MAP = `${process.env.STACK_NAME}:UsersToTasksIdsMap()`;
const CONNECTED_USERS_IDS_TO_NAMES_MAP = `${process.env.STACK_NAME}:UsersIdsToNamesMap()`;

// WebSocket clients connected to this task instance: userId --> socket
const connectedClients = new Map();

// Initialize Redis pub/sub clients, and Subscribe to this task's channel:
const publisher = getPublisherClient();
const subscriber = getSubscriberClient();
subscriber.subscribe(`task:${CURRENT_TASK_ID}`);
subscriber.on('message', onRedisPubSubMessage);

/*
  on new connection from a websocket client:
 */
const onWebsocketConnect = async (socket, request) => {
  const queryParams = url.parse(request.url, true).query;

  const decodedJwt = jwt.decode(queryParams.token);
  validateJWT(decodedJwt);

  const currentUserId = decodedJwt.sub ?? decodedJwt.identities.userId;
  const currentUserName = decodedJwt.name;

  socket.userId = currentUserId;
  connectedClients.set(currentUserId, socket);

  const redisClient = getRedisClient();
  await redisClient.hset(CONNECTED_USERS_TO_TASKS_IDS_MAP, currentUserId, CURRENT_TASK_ID);
  await redisClient.hset(CONNECTED_USERS_IDS_TO_NAMES_MAP, currentUserId, currentUserName);

  console.log(`Task ${CURRENT_TASK_ID}: User ${socket.userId} connected and inserted to ${CONNECTED_USERS_TO_TASKS_IDS_MAP}.`);
  console.log(`Task ${CURRENT_TASK_ID}: User ${socket.userId} connected and inserted to ${CONNECTED_USERS_IDS_TO_NAMES_MAP}.`);

  try {
    const isAdmin = isAdminUser(currentUserId);
    const response = {
      ...(await handleRead({
        commandParams: {
          accounts: { all: isAdmin },
          ...(isAdmin ? {} : { transactions: { fromFirstAccount: true } }), // Admin user is not currently intended to read transactions ...
        },
        connectedUserId: currentUserId,
      })),
      ...(isAdmin ? { isAdmin } : {}),
    };
    writeResponse({ response, responseSocket: socket });
  } catch (error) {
    socket.send(JSON.stringify({ message: 'Failed to read data for a new client:', error }));
  }

  // Websocket event handlers
  socket.on('message', (message) => onWebsocketMessage(message, socket));
  socket.on('close', () => onWebsocketDisconnect(socket));
};

/*
  Validate a JWT
 */
const validateJWT = (decodedJwt) => {
  if (!decodedJwt || (!decodedJwt.sub && !decodedJwt.identities.userId))
    throw new Error(`Invalid token: Missing userId: ${JSON.stringify(decodedJwt, null, 2)}`);

  const currentTimeInSeconds = Math.floor(Date.now() / 1000);
  if (decodedJwt.exp < currentTimeInSeconds) {
    throw new Error(`Token has expired ${currentTimeInSeconds - decodedJwt.exp} seconds ago`);
  }
};

/*
  on message from a connected websocket client:
 */
const onWebsocketMessage = async (message, socket) => {
  try {
    const redisClient = getRedisClient();
    const username = await redisClient.hget(CONNECTED_USERS_IDS_TO_NAMES_MAP, socket.userId);
    console.log(`Task ${CURRENT_TASK_ID}: Received ${message}, from user ${socket.userId}: ${username}`);

    // Execute command locally
    console.log(`Task ${CURRENT_TASK_ID}: Handling ${message} locally ...`);
    const { type: commandType, params: commandParams } = JSON.parse(message).command;
    await handleCommandWithNotifications({ commandType, commandParams, connectedUserId: socket.userId });
  } catch (error) {
    console.error(`Task ${CURRENT_TASK_ID}: Error handling websocket message:`, error);
    socket.send(JSON.stringify({ error: error.message }));
  }
};

// Handle command and send notifications
const handleCommandWithNotifications = async ({ commandType, commandParams, connectedUserId }) => {
  if (commandType === 'read' && commandParams.transactions && isAdminUser(connectedUserId))
    throw new Error('Admin user is not currently intended to read transactions ...');
  const response = await handleCommand({ commandType, commandParams, connectedUserId });

  const targetUserIds = determineTargetUsers({ commandType, commandParams, response, connectedUserId });
  if (targetUserIds.length > 0) {
    console.log(`Task ${CURRENT_TASK_ID}: Notification target user IDs: ${targetUserIds.join(', ')}`);
    const notificationMessage = {
      type: 'notification',
      commandType,
      response,
    };

    try {
      const redisClient = getRedisClient();
      for (const targetUserId of targetUserIds) {
        const targetTaskId = await redisClient.hget(CONNECTED_USERS_TO_TASKS_IDS_MAP, targetUserId);
        if (targetTaskId === CURRENT_TASK_ID) {
          // Write to the response socket in the current task:
          const responseSocket = connectedClients.get(targetUserId);
          writeResponse({ response, responseSocket });
        } else {
          // Publish the notification to the target task:
          console.log(`Task ${CURRENT_TASK_ID}: Publishing notification to task ${targetTaskId} for user ${targetUserId}`);
          await publisher.publish(`task:${targetTaskId}`, JSON.stringify({ ...notificationMessage, targetUserId }));
        }
      }
    } catch (error) {
      console.error(`Task ${CURRENT_TASK_ID}: Error publishing notification ${JSON.stringify(notificationMessage)}:`, error);
    }
  }
};

// Helper function to determine target users based on command type and parameters
function determineTargetUsers({ commandType, commandParams, response, connectedUserId }) {
  const targetUserIds = [];

  if (commandParams.accounts) {
    switch (commandType) {
      case 'create':
        targetUserIds.push(process.env.ADMIN_USER_ID, connectedUserId);
        break;
      case 'update':
        targetUserIds.push(response.dataUpdated.accounts.user_id);
        break;
      case 'delete':
        targetUserIds.push(response.dataDeleted.accounts.user_id);
        break;
    }
  } else if (commandParams.transactions) {
    switch (commandType) {
      case 'create':
        if (response.dataCreated.transactions.account) {
          // 'single-account' banking function (deposit, withdraw):
          targetUserIds.push(response.dataCreated.transactions.account.user_id);
        } else {
          // 'transfer' banking function, between two accounts:
          targetUserIds.push(
            response.dataCreated.transactions.accounts.withdrawResult.user_id,
            response.dataCreated.transactions.accounts.depositResult.user_id
          );
        }
        break;
      case 'read':
        targetUserIds.push(connectedUserId);
        break;
      default:
        Console.log('Not implemented!');
        break;
    }
  }

  return targetUserIds;
}

// Handle incoming messages from Redis pub/sub
async function onRedisPubSubMessage(channel, message) {
  try {
    console.log(`Task ${CURRENT_TASK_ID}: Received thru channel '${channel}' : ${message}`);
    const notification = JSON.parse(message);
    if (notification.type === 'notification') {
      // Write to the response socket in the current task:
      const responseSocket = connectedClients.get(notification.targetUserId);
      writeResponse({ response: notification.response, responseSocket });
    }
  } catch (error) {
    console.error(`Task ${CURRENT_TASK_ID}: Error processing pub/sub message:`, error);
  }
}

/*
  on disconnect from a websocket client:
 */
const onWebsocketDisconnect = async (socket) => {
  try {
    const redisClient = getRedisClient();
    await redisClient.hdel(CONNECTED_USERS_TO_TASKS_IDS_MAP, socket.userId);
    await redisClient.hdel(CONNECTED_USERS_IDS_TO_NAMES_MAP, socket.userId);
    console.log(`Task ${CURRENT_TASK_ID}: User ${socket.userId} disconnected and removed from ${CONNECTED_USERS_TO_TASKS_IDS_MAP}.`);
    console.log(`Task ${CURRENT_TASK_ID}: User ${socket.userId} disconnected and removed from ${CONNECTED_USERS_IDS_TO_NAMES_MAP}.`);

    connectedClients.delete(socket.userId);
  } catch (error) {
    console.error(`Task ${CURRENT_TASK_ID}: Error during disconnect:`, error);
  }
};

// Helper function to check if a user is an admin
function isAdminUser(userId) {
  return userId === process.env.ADMIN_USER_ID;
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

// Cleanup on process exit
process.on('SIGTERM', async () => {
  await subscriber.unsubscribe();
  await subscriber.quit();
  await publisher.quit();
});

module.exports = { onWebsocketConnect, CURRENT_TASK_ID };
