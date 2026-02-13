/**
 * k6 Performance Test: Workflow Operations
 * Load testing for workflow CRUD and execution
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const workflowCreationTime = new Trend('workflow_creation_duration');
const workflowExecutionTime = new Trend('workflow_execution_duration');
const apiLatency = new Trend('api_latency');
const successfulExecutions = new Counter('successful_executions');
const failedExecutions = new Counter('failed_executions');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike to 200 users
    { duration: '1m', target: 200 },  // Stay at spike
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% of requests should be below 500ms
    'http_req_failed': ['rate<0.01'],                  // Error rate should be less than 1%
    'errors': ['rate<0.05'],                           // Custom error rate should be less than 5%
    'workflow_creation_duration': ['p(95)<1000'],      // Workflow creation should be fast
    'workflow_execution_duration': ['p(95)<3000'],     // Workflow execution threshold
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const API_VERSION = '/api/v1';

// Test users created during setup
const testUsers = [
  { email: 'loadtest1@test.com', password: 'LoadTest123!' },
  { email: 'loadtest2@test.com', password: 'LoadTest123!' },
  { email: 'loadtest3@test.com', password: 'LoadTest123!' },
];

/**
 * Setup function - runs once per VU
 */
export function setup() {
  // Create test users
  const createdUsers = testUsers.map(user => {
    const res = http.post(`${BASE_URL}${API_VERSION}/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 201 || res.status === 409) { // 409 = already exists
      return user;
    }
    return null;
  }).filter(u => u !== null);

  return { users: createdUsers };
}

/**
 * Main test function
 */
export default function(data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  let authToken;

  group('Authentication', () => {
    const loginRes = http.post(
      `${BASE_URL}${API_VERSION}/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(loginRes, {
      'login successful': (r) => r.status === 200,
      'has auth token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.tokens && body.tokens.accessToken;
        } catch {
          return false;
        }
      },
    });

    if (loginRes.status === 200) {
      authToken = JSON.parse(loginRes.body).tokens.accessToken;
    } else {
      errorRate.add(1);
      return;
    }

    apiLatency.add(loginRes.timings.duration);
  });

  if (!authToken) return;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  // Test workflow operations
  group('Workflow CRUD Operations', () => {
    // Create workflow
    const workflowData = {
      name: `Load Test Workflow ${__VU}_${__ITER}`,
      description: 'Performance test workflow',
      nodes: [
        {
          id: 'node-1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Start', nodeType: 'manual', config: {} }
        },
        {
          id: 'node-2',
          type: 'action',
          position: { x: 300, y: 100 },
          data: { label: 'Log', nodeType: 'log', config: { message: 'Test' } }
        }
      ],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2' }
      ],
      tags: ['load-test']
    };

    const createStart = Date.now();
    const createRes = http.post(
      `${BASE_URL}${API_VERSION}/workflows`,
      JSON.stringify(workflowData),
      { headers }
    );

    const createDuration = Date.now() - createStart;
    workflowCreationTime.add(createDuration);

    check(createRes, {
      'workflow created': (r) => r.status === 201,
      'has workflow id': (r) => {
        try {
          return JSON.parse(r.body).workflow && JSON.parse(r.body).workflow.id;
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);

    if (createRes.status !== 201) return;

    const workflowId = JSON.parse(createRes.body).workflow.id;
    apiLatency.add(createRes.timings.duration);

    // Read workflow
    const readRes = http.get(
      `${BASE_URL}${API_VERSION}/workflows/${workflowId}`,
      { headers }
    );

    check(readRes, {
      'workflow retrieved': (r) => r.status === 200,
      'workflow data correct': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.workflow && body.workflow.id === workflowId;
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);

    apiLatency.add(readRes.timings.duration);

    // Update workflow
    const updateRes = http.patch(
      `${BASE_URL}${API_VERSION}/workflows/${workflowId}`,
      JSON.stringify({ description: 'Updated description' }),
      { headers }
    );

    check(updateRes, {
      'workflow updated': (r) => r.status === 200,
    }) || errorRate.add(1);

    apiLatency.add(updateRes.timings.duration);

    // List workflows
    const listRes = http.get(
      `${BASE_URL}${API_VERSION}/workflows?page=1&limit=10`,
      { headers }
    );

    check(listRes, {
      'workflows listed': (r) => r.status === 200,
      'has workflows array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).workflows);
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);

    apiLatency.add(listRes.timings.duration);

    // Clean up - delete workflow
    const deleteRes = http.del(
      `${BASE_URL}${API_VERSION}/workflows/${workflowId}`,
      { headers }
    );

    check(deleteRes, {
      'workflow deleted': (r) => r.status === 200 || r.status === 204,
    }) || errorRate.add(1);

    apiLatency.add(deleteRes.timings.duration);
  });

  // Test workflow execution
  group('Workflow Execution', () => {
    // Create a workflow for execution testing
    const execWorkflowData = {
      name: `Exec Test Workflow ${__VU}_${__ITER}`,
      description: 'Execution test workflow',
      nodes: [
        {
          id: 'node-1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Start', nodeType: 'manual', config: {} }
        },
        {
          id: 'node-2',
          type: 'transform',
          position: { x: 300, y: 100 },
          data: {
            label: 'Transform',
            nodeType: 'json-transform',
            config: { transformation: 'return { ...data, processed: true }' }
          }
        },
        {
          id: 'node-3',
          type: 'action',
          position: { x: 500, y: 100 },
          data: { label: 'Log', nodeType: 'log', config: { message: 'Complete' } }
        }
      ],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' }
      ],
      status: 'ACTIVE'
    };

    const createRes = http.post(
      `${BASE_URL}${API_VERSION}/workflows`,
      JSON.stringify(execWorkflowData),
      { headers }
    );

    if (createRes.status !== 201) {
      errorRate.add(1);
      return;
    }

    const workflowId = JSON.parse(createRes.body).workflow.id;

    // Activate workflow
    http.post(
      `${BASE_URL}${API_VERSION}/workflows/${workflowId}/activate`,
      null,
      { headers }
    );

    // Execute workflow
    const executeStart = Date.now();
    const executeRes = http.post(
      `${BASE_URL}${API_VERSION}/workflows/${workflowId}/execute`,
      JSON.stringify({ input: { test: true, timestamp: Date.now() } }),
      { headers }
    );

    const executeDuration = Date.now() - executeStart;
    workflowExecutionTime.add(executeDuration);

    const executeSuccess = check(executeRes, {
      'execution started': (r) => r.status === 200 || r.status === 201,
      'has execution id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.execution && body.execution.id;
        } catch {
          return false;
        }
      },
    });

    if (executeSuccess) {
      successfulExecutions.add(1);
      const executionId = JSON.parse(executeRes.body).execution.id;

      // Poll for execution result
      let attempts = 0;
      let completed = false;

      while (attempts < 10 && !completed) {
        sleep(0.5);
        const statusRes = http.get(
          `${BASE_URL}${API_VERSION}/executions/${executionId}`,
          { headers }
        );

        if (statusRes.status === 200) {
          try {
            const status = JSON.parse(statusRes.body).execution.status;
            if (status === 'SUCCESS' || status === 'FAILED') {
              completed = true;
              check(statusRes, {
                'execution completed successfully': () => status === 'SUCCESS',
              }) || errorRate.add(1);
            }
          } catch {}
        }

        attempts++;
      }
    } else {
      failedExecutions.add(1);
      errorRate.add(1);
    }

    apiLatency.add(executeRes.timings.duration);

    // Clean up
    http.del(`${BASE_URL}${API_VERSION}/workflows/${workflowId}`, { headers });
  });

  // Test concurrent operations
  group('Concurrent Operations', () => {
    const concurrentRequests = [];

    // Create multiple workflows concurrently
    for (let i = 0; i < 5; i++) {
      concurrentRequests.push({
        method: 'POST',
        url: `${BASE_URL}${API_VERSION}/workflows`,
        body: JSON.stringify({
          name: `Concurrent Workflow ${__VU}_${__ITER}_${i}`,
          description: 'Concurrent test',
          nodes: [],
          edges: []
        }),
        params: { headers }
      });
    }

    const responses = http.batch(concurrentRequests);

    check(responses, {
      'all concurrent requests successful': (responses) =>
        responses.every(r => r.status === 201),
    }) || errorRate.add(1);

    // Clean up
    responses.forEach(res => {
      if (res.status === 201) {
        try {
          const workflowId = JSON.parse(res.body).workflow.id;
          http.del(`${BASE_URL}${API_VERSION}/workflows/${workflowId}`, { headers });
        } catch {}
      }
    });
  });

  sleep(1); // Think time
}

/**
 * Teardown function - runs once after all VUs complete
 */
export function teardown(data) {
  // Clean up test users if needed
  console.log('Load test completed');
}

/**
 * Handle summary - custom summary output
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'test-results/k6-load-test-results.json': JSON.stringify(data),
    'test-results/k6-load-test-summary.html': htmlReport(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  let summary = `\n${indent}Load Test Summary\n${indent}================\n\n`;

  // Add key metrics
  summary += `${indent}Requests:\n`;
  summary += `${indent}  Total: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Failed: ${data.metrics.http_req_failed.values.rate * 100}%\n\n`;

  summary += `${indent}Response Time:\n`;
  summary += `${indent}  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;

  summary += `${indent}Custom Metrics:\n`;
  summary += `${indent}  Successful Executions: ${data.metrics.successful_executions.values.count}\n`;
  summary += `${indent}  Failed Executions: ${data.metrics.failed_executions.values.count}\n`;
  summary += `${indent}  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;

  return summary;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>k6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; border-left: 4px solid #007bff; }
    .passed { border-left-color: #28a745; }
    .failed { border-left-color: #dc3545; }
    h1, h2 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #007bff; color: white; }
  </style>
</head>
<body>
  <h1>k6 Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <h2>Test Configuration</h2>
  <div class="metric">
    <strong>Duration:</strong> ${data.state.testRunDurationMs / 1000} seconds<br>
    <strong>VUs:</strong> Max ${data.metrics.vus_max.values.max}
  </div>

  <h2>HTTP Metrics</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Count</th>
      <th>Rate</th>
      <th>Avg</th>
      <th>P95</th>
      <th>P99</th>
    </tr>
    <tr>
      <td>HTTP Requests</td>
      <td>${data.metrics.http_reqs.values.count}</td>
      <td>${data.metrics.http_reqs.values.rate.toFixed(2)}/s</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
    </tr>
    <tr>
      <td>HTTP Duration</td>
      <td>-</td>
      <td>-</td>
      <td>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td>
      <td>${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td>
      <td>${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</td>
    </tr>
  </table>

  <h2>Custom Metrics</h2>
  <div class="metric ${data.metrics.successful_executions.values.count > 0 ? 'passed' : ''}">
    <strong>Successful Executions:</strong> ${data.metrics.successful_executions.values.count}
  </div>
  <div class="metric ${data.metrics.failed_executions.values.count === 0 ? 'passed' : 'failed'}">
    <strong>Failed Executions:</strong> ${data.metrics.failed_executions.values.count}
  </div>
  <div class="metric ${data.metrics.errors.values.rate < 0.05 ? 'passed' : 'failed'}">
    <strong>Error Rate:</strong> ${(data.metrics.errors.values.rate * 100).toFixed(2)}%
  </div>

  <h2>Threshold Results</h2>
  ${Object.entries(data.metrics)
    .filter(([_, metric]) => metric.thresholds)
    .map(([name, metric]) => {
      const passed = Object.values(metric.thresholds).every(t => t.ok);
      return `<div class="metric ${passed ? 'passed' : 'failed'}">
        <strong>${name}:</strong> ${passed ? '✓ PASSED' : '✗ FAILED'}
      </div>`;
    })
    .join('')}
</body>
</html>
  `;
}
