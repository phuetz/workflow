// Artillery processor for custom functions and test data
// Used by load, stress, soak, and spike tests

module.exports = {
  // Generate random string
  generateRandomString,

  // Generate random number
  generateRandomNumber,

  // Generate timestamp
  generateTimestamp,

  // Setup test data before scenarios
  beforeScenario,

  // Cleanup after scenario
  afterScenario,

  // Custom metrics
  customMetrics
};

function generateRandomString(context, events, done) {
  context.vars.randomString = Math.random().toString(36).substring(7);
  return done();
}

function generateRandomNumber(context, events, done) {
  context.vars.randomNumber = Math.floor(Math.random() * 1000000);
  return done();
}

function generateTimestamp(context, events, done) {
  context.vars.timestamp = Date.now();
  return done();
}

function beforeScenario(context, events, done) {
  // Initialize test data
  context.vars.authToken = process.env.TEST_AUTH_TOKEN || 'test-token-12345';
  context.vars.workflowId = process.env.TEST_WORKFLOW_ID || 'workflow-test-001';
  context.vars.webhookId = process.env.TEST_WEBHOOK_ID || 'webhook-test-001';

  // Add timestamp for correlation
  context.vars.sessionStart = Date.now();
  context.vars.sessionId = `session-${Math.random().toString(36).substring(7)}`;

  return done();
}

function afterScenario(context, events, done) {
  // Calculate session duration
  if (context.vars.sessionStart) {
    const duration = Date.now() - context.vars.sessionStart;
    events.emit('counter', 'session.duration', duration);
  }

  return done();
}

function customMetrics(context, events, done) {
  // Emit custom metrics
  events.emit('counter', 'custom.workflows.executed', 1);
  events.emit('histogram', 'custom.response.time', context.vars.responseTime || 0);

  return done();
}

// Helper function to generate realistic workflow data
function generateWorkflowData() {
  const nodeTypes = ['trigger', 'httpRequest', 'delay', 'email', 'slack', 'filter', 'merge'];
  const nodeCount = Math.floor(Math.random() * 5) + 3; // 3-7 nodes

  const nodes = [];
  const edges = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
      position: { x: i * 200, y: 100 },
      data: {
        label: `Node ${i}`,
        config: {}
      }
    });

    if (i > 0) {
      edges.push({
        id: `edge-${i}`,
        source: `node-${i - 1}`,
        target: `node-${i}`
      });
    }
  }

  return { nodes, edges };
}

// Export for use in workflows
module.exports.generateWorkflowData = generateWorkflowData;
