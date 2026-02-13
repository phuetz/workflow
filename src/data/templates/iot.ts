/**
 * Workflow Templates - iot
 */

import type { WorkflowTemplate } from '../../types/templates';

export const IOT_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'iot-sensor-monitoring',
    name: 'IoT Sensor Monitoring',
    description: 'Monitor IoT sensors and trigger alerts when values exceed thresholds.',
    category: 'iot',
    subcategory: 'monitoring',
    author: 'System',
    authorType: 'official',
    tags: ['iot', 'sensors', 'monitoring', 'alerts', 'hardware'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'awsiot',
          position: { x: 100, y: 200 },
          data: {
            label: 'Sensor Data',
            properties: {
              topic: 'sensors/#'
            },
            credentials: ['awsIotApi']
          }
        },
        {
          id: 'check-1',
          type: 'code',
          position: { x: 300, y: 200 },
          data: {
            label: 'Check Thresholds',
            properties: {
              code: `// Check sensor thresholds
const alerts = [];
if (data.temperature > 80) alerts.push('High temperature: ' + data.temperature);
if (data.humidity < 20) alerts.push('Low humidity: ' + data.humidity);
return [{...data, hasAlerts: alerts.length > 0, alerts}];`
            }
          }
        },
        {
          id: 'influx-1',
          type: 'influxdb',
          position: { x: 500, y: 150 },
          data: {
            label: 'Store Metrics',
            properties: {
              operation: 'write',
              bucket: 'sensors',
              measurement: 'sensor_data'
            },
            credentials: ['influxdbApi']
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 500, y: 250 },
          data: {
            label: 'Alert Team',
            properties: {
              channel: '#iot-alerts',
              text: 'Sensor alert: {{$node["check-1"].json.alerts.join(", ")}}'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'check-1' },
        { id: 'e2', source: 'check-1', target: 'influx-1' },
        { id: 'e3', source: 'check-1', target: 'slack-1', sourceHandle: 'has-alerts' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-06-20'),
    updatedAt: new Date(),
    downloads: 0,
    rating: 4.6,
    reviewCount: 0,
    featured: false,
    requiredIntegrations: ['awsiot', 'code', 'influxdb', 'slack'],
    requiredCredentials: ['awsIotApi', 'influxdbApi', 'slackApi'],
    estimatedSetupTime: 25,
    documentation: {
      overview: 'IoT sensor monitoring and alerting.',
      setup: [],
      usage: 'Connect IoT devices to AWS IoT.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  }
];
