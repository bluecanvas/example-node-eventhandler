const Queue = require('bull');
const throng = require('throng');
const { Client } = require('@bluecanvas/sdk');

// Credentials for the Blue Canvas API
const clientId = process.env.BLUECANVAS_CLIENT_ID;
const clientSecret = process.env.BLUECANVAS_CLIENT_SECRET;

// Connect to a local redis intance locally, and the
// Heroku-provided URL in production.
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
const workers = process.env.WEB_CONCURRENCY || 2;

// The maxium number of jobs each worker should process at once. This will need
// to be tuned for your application. If each job is mostly waiting on network
// responses it can be much higher. If each job is CPU-intensive, it might need
// to be much lower.
const maxJobsPerWorker = 50;

function start() {
  // Connect to the named work queue
  const q = new Queue('notifications', redisUrl);

  // Initialize the Blue Canvas API client
  const bluecanvas = new Client({
    clientId,
    clientSecret
  });

  // Declare helper functions
  async function putCheck(message, check) {
    await bluecanvas.deployments.putCheck({
      deploymentNumber: message['Deployment'].deploymentNumber,
      name: 'wall-e',
      check
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  q.process(maxJobsPerWorker, async (job) => {
    const { message } = job.data;

    console.log('Got notification from Blue Canvas:', message);

    // Look for specific event types. This one is emitted when a new
    // deployment request is created. You can find other event types
    // in the Events API documentation.
    if (message['Event'] !== 'deployments/created') {
      return;
    }

    // This is an example job that just slowly reports on progress
    // while doing no work. Replace this with your own job logic.
    let progress = 0;

    while (progress < 100) {
      await putCheck(message, {
        state: 'IN_PROGRESS',
        description: `${progress}%`,
      });
      await sleep(1000);
      progress += 10;
    }

    if (Math.random() < 0.25) {
      // Throw an error 25% of the time
      await putCheck(message, {
        state: 'DONE',
        result: 'FAILURE',
        description: `Something didn't go right. Well, that was unexpected!`,
      });
    } else {
      // Mark the check as successful
      await putCheck(message, {
        state: 'DONE',
        result: 'SUCCESS',
        description: 'The results are in, everything looks spiffy.',
        externalUrl: 'https://example.com'
      });
    }

    // A job can return values that will be stored in Redis as JSON
    // This return value is unused in this demo application.
    return { value: 'This will be stored' };
  });
}

// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
throng({ workers, start });
