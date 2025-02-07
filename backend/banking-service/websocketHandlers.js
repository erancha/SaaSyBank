const url = require('url');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { CURRENT_TASK_ID } = require('./constants');
const { handleCommand, handleRead, writeResponse } = require('./commandsHandlers');
const { getRedisClient, getPublisherClient, getSubscriberClient } = require('./redisClient');

// Refer to ./websockets-ecs.png
// -----------------------------
const CONNECTED_CLIENTS_TASKS_MAP = `${process.env.STACK_NAME}:clientsTasksMap()`;
const CONNECTED_CLIENTS_USERNAMES_MAP = `${process.env.STACK_NAME}:clientsUsernamesMap()`;

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
  await redisClient.hset(CONNECTED_CLIENTS_TASKS_MAP, currentUserId, CURRENT_TASK_ID);
  await redisClient.hset(CONNECTED_CLIENTS_USERNAMES_MAP, currentUserId, currentUserName);

  console.log(`Task ${CURRENT_TASK_ID}: User ${socket.userId} connected and inserted to ${CONNECTED_CLIENTS_TASKS_MAP}.`);
  console.log(`Task ${CURRENT_TASK_ID}: User ${socket.userId} connected and inserted to ${CONNECTED_CLIENTS_USERNAMES_MAP}.`);

  try {
    const isAdmin = currentUserId === process.env.ADMIN_USER_ID;
    const response = {
      ...(await handleRead({ commandParams: { accounts: { all: isAdmin } }, connectedUserId: currentUserId })),
      ...(isAdmin ? { isAdmin } : {}),
    };
    writeResponse({ response, responseSocket: socket });
  } catch (error) {
    socket.send(JSON.stringify({ message: 'Failed to fetch accounts:', error }));
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
    const username = await redisClient.hget(CONNECTED_CLIENTS_USERNAMES_MAP, socket.userId);
    console.log(`Task ${CURRENT_TASK_ID}: Received ${message}, from user ${socket.userId}: ${username}`);

    const { type: commandType, params: commandParams, to: commandTargetUserId } = JSON.parse(message).command;

    // the client didn't target another user to receive the response, or targeted itself:
    //-----------------------------------------------------------------------------------
    if (!commandTargetUserId || commandTargetUserId === 'self') {
      console.log(`Task ${CURRENT_TASK_ID}: Handling ${message} locally ...`);
      const commandClientSocket = commandTargetUserId /*self*/ ? socket : undefined;
      await handleCommand({ commandType, commandParams, connectedUserId: socket.userId, commandClientSocket });
    } else {
      // the client targeted another user to receive the response:
      //----------------------------------------------------------
      // Identify the ECS task that should handle the command, based on commandTargetUserId:
      const commandClientSocket = connectedClients.get(commandTargetUserId);
      if (commandClientSocket) {
        // the target user is connected to the current task instance
        console.log(`Task ${CURRENT_TASK_ID}: Handling ${message} locally ...`);
        await handleCommand({ commandType, commandParams, connectedUserId: commandTargetUserId, commandClientSocket });
      } else {
        const targetTaskId = await redisClient.hget(CONNECTED_CLIENTS_TASKS_MAP, commandTargetUserId);
        if (!targetTaskId) console.error(`Task ${CURRENT_TASK_ID}: Target task not found in ${CONNECTED_CLIENTS_TASKS_MAP} for user ${commandTargetUserId}`);
        else {
          // Since the command is for another task, publish to Redis:
          console.log(`Task ${CURRENT_TASK_ID}: Delivering ${message}, thru channel 'task:${targetTaskId}' ...`);
          try {
            await publisher.publish(`task:${targetTaskId}`, message);
          } catch (error) {
            console.error(`Task ${CURRENT_TASK_ID}: Error publishing message:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Task ${CURRENT_TASK_ID}: Error handling websocket message:`, error);
  }
};

// Handle incoming messages from Redis pub/sub
async function onRedisPubSubMessage(channel, message) {
  try {
    console.log(`Task ${CURRENT_TASK_ID}: Received ${message}, from channel '${channel}'`);
    const { type: commandType, params: commandParams, to: commandTargetUserId } = JSON.parse(message).command;

    const commandClientSocket = connectedClients.get(commandTargetUserId);
    if (!commandClientSocket) console.error(`Task ${CURRENT_TASK_ID}: Socket not found for user ${commandTargetUserId}`);
    else {
      console.log(`Task ${CURRENT_TASK_ID}: Handling ${message} locally ...`);
      await handleCommand({ commandType, commandParams, commandClientSocket });
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

    await redisClient.hdel(CONNECTED_CLIENTS_TASKS_MAP, socket.userId);
    console.log(`Task ${CURRENT_TASK_ID}: User ${socket.userId} disconnected and removed from ${CONNECTED_CLIENTS_TASKS_MAP}.`);

    await redisClient.hdel(CONNECTED_CLIENTS_USERNAMES_MAP, socket.userId);
    console.log(`Task ${CURRENT_TASK_ID}: User ${socket.userId} disconnected and removed from ${CONNECTED_CLIENTS_USERNAMES_MAP}.`);

    connectedClients.delete(socket.userId);
  } catch (error) {
    console.error(`Task ${CURRENT_TASK_ID}: Error during disconnect:`, error);
  }
};

// Cleanup on process exit
process.on('SIGTERM', async () => {
  await subscriber.unsubscribe();
  await subscriber.quit();
  await publisher.quit();
});

module.exports = { onWebsocketConnect, CURRENT_TASK_ID };
