const { v4: uuidv4 } = require('uuid');

const CURRENT_TASK_ID = uuidv4();
console.log(`Started task: ${CURRENT_TASK_ID}`);

module.exports = { CURRENT_TASK_ID };
