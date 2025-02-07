const Redis = require('ioredis');

let _redisClient = null;
let _publisherClient = null;
let _subscriberClient = null;

const getRedisClient = () => {
  if (!_redisClient) _redisClient = new Redis(process.env.ELASTICACHE_REDIS_ADDRESS);
  return _redisClient;
};

const getPublisherClient = () => {
  if (!_publisherClient) _publisherClient = new Redis(process.env.ELASTICACHE_REDIS_ADDRESS);
  return _publisherClient;
};

const getSubscriberClient = () => {
  if (!_subscriberClient) _subscriberClient = new Redis(process.env.ELASTICACHE_REDIS_ADDRESS);
  return _subscriberClient;
};

const disposeRedisClient = async () => {
  if (_redisClient) {
    await _redisClient.quit();
    _redisClient = null;
  }
  if (_publisherClient) {
    await _publisherClient.quit();
    _publisherClient = null;
  }
  if (_subscriberClient) {
    await _subscriberClient.quit();
    _subscriberClient = null;
  }
};

async function testRedisConnectivity() {
  try {
    const redisClient = getRedisClient();
    const keys = await redisClient.keys('*');

    if (keys.length > 0) {
      console.log(`Found ${keys.length} keys :`);
      keys.sort();

      for (const key of keys) {
        const type = await redisClient.type(key);
        if (type === 'string') {
          const value = await redisClient.get(key);
          console.log(`${key.padEnd(35, ' ')}  ==>  ${value}`);
        } else if (type === 'set') {
          const members = await redisClient.smembers(key);
          const MAX_KEY_LENGTH = 40;
          console.log(
            `${key.length < MAX_KEY_LENGTH ? key.padEnd(MAX_KEY_LENGTH, ' ') : `${key.substring(0, MAX_KEY_LENGTH - 2)}..`}  ==>  ${JSON.stringify(members)}`
          );
        } else if (type === 'list') {
          const length = await redisClient.llen(key);
          console.log(`${key.padEnd(25, ' ')} ==> ${length} items`);
        } else if (type === 'hash') {
          const fields = await redisClient.hkeys(key);
          const fieldValues = {};

          for (const field of fields) {
            const value = await redisClient.hget(key, field);
            fieldValues[field] = value;
          }

          console.log(`Hash ${key} : ${JSON.stringify(fieldValues)}`);
        } else {
          console.log(`The value of '${key}' is '${type}' ! (not a string, set, list, or hash)`);
        }
      }
    }

    return keys.length;
  } catch (error) {
    console.error('Redis Connectivity Test Failed:', error);
  }
}

module.exports = {
  getRedisClient,
  getPublisherClient,
  getSubscriberClient,
  disposeRedisClient,
  testRedisConnectivity,
};
