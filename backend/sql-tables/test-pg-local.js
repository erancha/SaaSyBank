const { handler } = require('./creation');

const event = {};

async function runHandler() {
  try {
    const response = await handler(event);
    console.log('Response:', response);
  } catch (error) {
    console.error('Error calling handler:', error);
  }
}

runHandler();
