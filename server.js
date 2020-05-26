const Hapi = require('@hapi/hapi');
const Queue = require('bull');
const { EventHandlerPlugin } = require('@bluecanvas/sdk');

// Read options from environment variables
const tenantId = process.env.BLUECANVAS_TENANT_ID;
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const port = process.env.PORT || 3000;

async function main() {
  // Connect to a named work queue
  const q = new Queue('notifications', redisUrl);

  // Initialize the server and enable error logging
  const server = new Hapi.Server({
    debug: { request: ['error'] },
    host: '0.0.0.0',
    port,
  });

  // Register the Blue Canvas `EventHandlerPlugin` with the server and
  // pass our `tenantId` and `onNotification` handler as options.
  await server.register({
    plugin: EventHandlerPlugin,
    options: {
      tenantId,
      onNotification: async (req, h, message) => {
        // Kick off a new job by adding it to the work queue
        await q.add({ message });
      }
    }
  });

  // You can listen to global events to get notified when jobs are processed
  q.on('global:completed', (jobId, result) => {
    console.log(`Job completed with result ${result}`);
  });

  // Ready, set, go!
  await server.start();

  console.log('Server listening on %s and waiting for notifications', server.info.uri);
}

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

main();
