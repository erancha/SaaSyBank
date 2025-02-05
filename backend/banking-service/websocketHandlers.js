const url = require('url');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const dbData = require('./dbData');
const { getRedisClient, getPublisherClient, getSubscriberClient } = require('./redisClient');

const CURRENT_TASK_ID = uuidv4();
console.log(`Started task: ${CURRENT_TASK_ID}`);

// Refer to ./websockets-ecs.png
const CONNECTED_CLIENTS_TASKS_MAP = `${process.env.STACK_NAME}:clientsTasksMap()`;
// const CONNECTED_CLIENTS_USERNAMES_MAP = `${process.env.STACK_NAME}:clientsUsernamesMap()`;

// Initialize Redis pub/sub clients
const publisher = getPublisherClient();
const subscriber = getSubscriberClient();

// WebSocket clients connected to this task instance
const connectedClients = new Map();

// Subscribe to this task's channel
subscriber.subscribe(`task:${CURRENT_TASK_ID}`);

// Handle incoming messages from Redis pub/sub
subscriber.on('message', onRedisPubSubMessage);

/*
  on new connection from a client:
 */
const onWebsocketConnect = (socket, request) => {
  const queryParams = url.parse(request.url, true).query;

  const decodedJwt = jwt.decode(queryParams.token);
  validateJWT(decodedJwt);

  const currentUserId = decodedJwt.sub ?? decodedJwt.identities.userId;
  const currentUserName = decodedJwt.name;
  console.log(`Task ${CURRENT_TASK_ID}: New client connection: ${JSON.stringify({ currentUserId, currentUserName }, null, 2)}`);

  socket.userId = currentUserId;
  connectedClients.set(currentUserId, socket);

  const redisClient = getRedisClient();
  redisClient.hset(CONNECTED_CLIENTS_TASKS_MAP, currentUserId, CURRENT_TASK_ID);
  // redisClient.hset(CONNECTED_CLIENTS_USERNAMES_MAP, currentUserId, currentUserName);

  // Handle sending initial data after connection
  dbData
    .listAccounts(process.env.TENANT_ID)
    .then((result) => {
      socket.send(JSON.stringify({ accounts: result.rows || [] }));
    })
    .catch((error) => {
      console.error(`Task ${CURRENT_TASK_ID}: Error fetching accounts:`, error);
      socket.send(JSON.stringify({ error: 'Failed to fetch accounts' }));
    });

  // Websocket event handlers
  socket.on('message', (message) => onWebsocketMessage(message, socket, redisClient));
  socket.on('close', () => onWebsocketDisconnect(socket, redisClient));
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
  on message from a connected client:
 */
const onWebsocketMessage = (message, socket, redisClient) => {
  // redisClient
  //   .hget(CONNECTED_CLIENTS_USERNAMES_MAP, socket.userId)
  //   .then((username) => {
  //     console.log(`Task ${CURRENT_TASK_ID}: ${username}`);
  //   })
  //   .catch((error) => console.error(`Task ${CURRENT_TASK_ID}: Error getting client ID from ${CONNECTED_CLIENTS_USERNAMES_MAP}:`, error));

  const parsedMessage = JSON.parse(message);
  const messageContent = parsedMessage.data.messageContent;
  console.log(`Task ${CURRENT_TASK_ID}: Received from user: ${socket.userId}, message: ${messageContent}`);
  const parsedMessageContent = JSON.parse(messageContent); // TODO (test): {"toUserId": "43e4c8a2-4081-70d9-613a-244f8f726307", "text": "Hello Tester Betty!"} , using Chatty's frontend: "WEBSOCKET_API_URL": "http://sbf-ALB-986549444.eu-central-1.elb.amazonaws.com/api/banking/ws"
  const toUserId = parsedMessageContent.toUserId;

  redisClient
    .hget(CONNECTED_CLIENTS_TASKS_MAP, toUserId)
    .then((toTaskId /* the task id that accepted the initial websocket connection from toUserId */) => {
      if (toTaskId) {
        // If the message is for the current task, deliver directly
        if (toTaskId === CURRENT_TASK_ID) {
          const toUserSocket = connectedClients.get(toUserId);
          if (toUserSocket) {
            console.log(`Task ${CURRENT_TASK_ID}: Delivering message: ${parsedMessageContent.text}, to user: ${toUserId}, directly ...`);
            toUserSocket.send(JSON.stringify({ content: parsedMessageContent.text }));
          } else console.error(`Task ${CURRENT_TASK_ID}: No target socket found for user: ${toUserId}`);
        } else {
          // If message is for different task, publish to Redis
          console.log(`Task ${CURRENT_TASK_ID}: Delivering message: ${parsedMessageContent.text}, to user: ${toUserId}, thru task:${toTaskId} ...`);
          publisher
            .publish(
              `task:${toTaskId}`,
              JSON.stringify({
                toUserId,
                text: parsedMessageContent.text,
              })
            )
            .catch((error) => console.error(`Task ${CURRENT_TASK_ID}: Error publishing message:`, error));
        }
      } else console.error(`Task ${CURRENT_TASK_ID}: Error finding target task for user: ${socket.userId} in ${CONNECTED_CLIENTS_TASKS_MAP}`);
    })
    .catch((error) => console.error(`Task ${CURRENT_TASK_ID}: Error getting task for user: ${socket.userId} in ${CONNECTED_CLIENTS_TASKS_MAP}`, error));
};

/*
  on disconnect from a client:
 */
const onWebsocketDisconnect = (socket, redisClient) => {
  redisClient.hdel(CONNECTED_CLIENTS_TASKS_MAP, socket.userId, (err, res) => {
    if (err) console.error(`Task ${CURRENT_TASK_ID}: Error deleting user ${socket.userId} from ${CONNECTED_CLIENTS_TASKS_MAP}:`, err);
    else console.log(`Task ${CURRENT_TASK_ID}: User ${socket.userId} disconnected and removed from ${CONNECTED_CLIENTS_TASKS_MAP}.`);
  });
  // redisClient.hdel(CONNECTED_CLIENTS_USERNAMES_MAP_MAP, socket.userId, (err, res) => {
  //   if (err) console.error(`Task ${CURRENT_TASK_ID}: Error deleting client ID from ${CONNECTED_CLIENTS_USERNAMES_MAP_MAP}:`, err);
  //   else console.log(`Task ${CURRENT_TASK_ID}: Client ${socket.userId} disconnected and removed from ${CONNECTED_CLIENTS_USERNAMES_MAP_MAP}.`);
  // });
  connectedClients.delete(socket.userId);
};

// Handle incoming messages from Redis pub/sub
async function onRedisPubSubMessage(channel, message) {
  try {
    console.log(`Task ${CURRENT_TASK_ID}: Received message: ${message}, from channel: ${channel}`);
    const { toUserId, text } = JSON.parse(message);
    const clientSocket = connectedClients.get(toUserId);
    if (clientSocket) {
      console.log(`Task ${CURRENT_TASK_ID}: Delivering message: ${text}, to user: ${toUserId}`);
      clientSocket.send(JSON.stringify({ content: text }));
    } else console.error(`Task ${CURRENT_TASK_ID}: No target socket found for user: ${toUserId}`);
  } catch (error) {
    console.error(`Task ${CURRENT_TASK_ID}: Error processing pub/sub message:`, error);
  }
}

// Cleanup on process exit
process.on('SIGTERM', () => {
  subscriber.unsubscribe();
  subscriber.quit();
  publisher.quit();
});

module.exports = { onWebsocketConnect, CURRENT_TASK_ID };
