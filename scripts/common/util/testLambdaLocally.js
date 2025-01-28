// const { v4: uuidv4 } = require('uuid');

// Function to allow testing the handler locally
const innerHandler = async (event, postRandomizationCallback) => {
  let statusCode = 200;
  try {
    postRandomizationCallback({ p1: 'abc' });
  } catch (error) {
    console.error(`Error processing event ${JSON.stringify(event, null, 2)} : ${error}`);
    statusCode = 500; // internal server error
  }

  return { statusCode };
};

(async () => {
  await innerHandler({}, async ({ p1 }) => {
    console.log({ p1 });
  });
})();
