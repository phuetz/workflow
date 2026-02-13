/**
 * Workflow Templates - monitoring
 */

import type { WorkflowTemplate } from '../../types/templates';

export const MONITORING_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'system-health-monitor',
    name: 'System Health Monitor',
    description: 'Monitor system health metrics and send alerts when issues are detected across your infrastructure.',
    category: 'monitoring',
    subcategory: 'infrastructure',
    author: 'System',
    authorType: 'official',
    tags: ['monitoring', 'alerts', 'devops', 'infrastructure', 'health'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Every 5 Minutes',
            properties: {
              cron: '*/5 * * * *',
              timezone: 'UTC'
            }
          }
        },
        {
          id: 'http-1',
          type: 'http_request',
          position: { x: 300, y: 200 },
          data: {
            label: 'Check API Health',
            properties: {
              method: 'GET',
              url: 'https://api.yourcompany.com/health',
              timeout: 5000
            }
          }
        },
        {
          id: 'check-1',
          type: 'code_javascript',
          position: { x: 500, y: 200 },
          data: {
            label: 'Evaluate Health',
            properties: {
              code: `// Evaluate system health
const issues = [];

if (health.response_time > 1000) {
  issues.push('High response time: ' + health.response_time + 'ms');
}

if (health.cpu_usage > 80) {
  issues.push('High CPU usage: ' + health.cpu_usage + '%');
}

if (health.memory_usage > 85) {
  issues.push('High memory usage: ' + health.memory_usage + '%');
}

return [{
  ...health,
  hasIssues: issues.length > 0,
  issues
}];`
            }
          }
        },
        {
          id: 'pagerduty-1',
          type: 'pagerduty',
          position: { x: 700, y: 150 },
          data: {
            label: 'Create Incident',
            properties: {
              operation: 'createIncident',
              title: 'System Health Alert',
              description: '={{$node["check-1"].json.issues.join(", ")}}',
              urgency: 'high'
            },
            credentials: ['pagerdutyApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 700, y: 250 },
          data: {
            label: 'Notify Team',
            properties: {
              channel: '#alerts',
              text: 'System health issues detected: {{$node["check-1"].json.issues.join(", ")}}'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'http-1' },
        { id: 'e2', source: 'http-1', target: 'check-1' },
        { id: 'e3', source: 'check-1', target: 'pagerduty-1', sourceHandle: 'has-issues' },
        { id: 'e4', source: 'check-1', target: 'slack-1', sourceHandle: 'has-issues' }
      ]
    },
    version: '1.1.0',
    createdAt: new Date('2024-02-18'),
    updatedAt: new Date(),
    downloads: 923,
    rating: 4.8,
    reviewCount: 102,
    featured: true,
    requiredIntegrations: ['schedule_trigger', 'http_request', 'code_javascript', 'pagerduty', 'slack'],
    requiredCredentials: ['pagerdutyApi', 'slackApi'],
    estimatedSetupTime: 20,
    documentation: {
      overview: 'Comprehensive system health monitoring with intelligent alerting.',
      setup: [],
      usage: 'Monitors your systems every 5 minutes and alerts on issues.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'website-uptime-monitor',
    name: 'Website Uptime Monitor',
    description: 'Monitor website uptime and response times, sending instant notifications when your site goes down.',
    category: 'monitoring',
    subcategory: 'uptime',
    author: 'System',
    authorType: 'official',
    tags: ['uptime', 'monitoring', 'website', 'alerts', 'availability'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Every Minute',
            properties: {
              cron: '* * * * *',
              timezone: 'UTC'
            }
          }
        },
        {
          id: 'http-1',
          type: 'http_request',
          position: { x: 300, y: 200 },
          data: {
            label: 'Check Website',
            properties: {
              method: 'GET',
              url: 'https://yourwebsite.com',
              timeout: 10000,
              followRedirects: true
            }
          }
        },
        {
          id: 'check-1',
          type: 'code_javascript',
          position: { x: 500, y: 200 },
          data: {
            label: 'Check Status',
            properties: {
              code: `// Check if site is down
const isDown = response.statusCode >= 500 || response.statusCode === 0;
const isSlow = response.responseTime > 3000;

return [{
  ...response,
  isDown,
  isSlow,
  status: isDown ? 'down' : isSlow ? 'slow' : 'up'
}];`
            }
          }
        },
        {
          id: 'alert-1',
          type: 'twilio',
          position: { x: 700, y: 150 },
          data: {
            label: 'SMS Alert',
            properties: {
              operation: 'sendSMS',
              to: '+1234567890',
              message: 'URGENT: Your website is down! Status: {{$node["check-1"].json.statusCode}}'
            },
            credentials: ['twilioApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 700, y: 250 },
          data: {
            label: 'Slack Alert',
            properties: {
              channel: '#alerts',
              text: 'Website alert: {{$node["check-1"].json.status}} - Response time: {{$node["check-1"].json.responseTime}}ms'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'http-1' },
        { id: 'e2', source: 'http-1', target: 'check-1' },
        { id: 'e3', source: 'check-1', target: 'alert-1', sourceHandle: 'is-down' },
        { id: 'e4', source: 'check-1', target: 'slack-1', sourceHandle: 'is-slow' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date(),
    downloads: 1234,
    rating: 4.9,
    reviewCount: 145,
    featured: true,
    requiredIntegrations: ['schedule_trigger', 'http_request', 'code_javascript', 'twilio', 'slack'],
    requiredCredentials: ['twilioApi', 'slackApi'],
    estimatedSetupTime: 10,
    documentation: {
      overview: 'Get instant alerts when your website experiences downtime or performance issues.',
      setup: [],
      usage: 'Checks your website every minute and sends alerts.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  }
];
