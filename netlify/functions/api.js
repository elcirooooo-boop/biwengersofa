const serverless = require('serverless-http');
const app = require('../../server/app');

const serverlessHandler = serverless(app);

exports.handler = async (event, context) => {
  // Normalize path so /api/* routes match properly
  if (event.path && !event.path.startsWith('/api') && !event.path.startsWith('/.netlify')) {
    event.path = '/api' + (event.path.startsWith('/') ? event.path : '/' + event.path);
  }
  return await serverlessHandler(event, context);
};
