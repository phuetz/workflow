import { NodeType } from '../../types/workflow';

export const ANALYTICS_NODES: Record<string, NodeType> = {
  googleAnalytics: {
      type: 'googleAnalytics',
      label: 'Google Analytics',
      icon: 'BarChart3',
      color: 'bg-orange-500',
      category: 'analytics',
      inputs: 1,
      outputs: 1,
      description: 'Google Analytics integration'
    },
  mixpanel: {
      type: 'mixpanel',
      label: 'Mixpanel',
      icon: 'TrendingUp',
      color: 'bg-purple-600',
      category: 'analytics',
      inputs: 1,
      outputs: 1,
      description: 'Mixpanel analytics'
    },
  adobeAnalytics: {
      type: 'adobeAnalytics',
      label: 'Adobe Analytics',
      icon: 'LineChart',
      color: 'bg-red-600',
      category: 'analytics',
      inputs: 1,
      outputs: 1,
      description: 'Adobe Analytics integration'
    },
  amplitude: {
      type: 'amplitude',
      label: 'Amplitude',
      icon: 'Activity',
      color: 'bg-purple-600',
      category: 'analytics',
      inputs: 1,
      outputs: 1,
      description: 'Amplitude product analytics'
    },
  segment: {
      type: 'segment',
      label: 'Segment',
      icon: 'GitBranch',
      color: 'bg-green-600',
      category: 'analytics',
      inputs: 1,
      outputs: 1,
      description: 'Segment customer data platform'
    },
  hotjar: {
      type: 'hotjar',
      label: 'Hotjar',
      icon: 'MousePointer',
      color: 'bg-red-500',
      category: 'analytics',
      inputs: 1,
      outputs: 1,
      description: 'Hotjar user behavior analytics'
    },
  tableau: {
      type: 'tableau',
      label: 'Tableau',
      icon: 'BarChart2',
      color: 'bg-blue-700',
      category: 'analytics',
      inputs: 1,
      outputs: 1,
      description: 'Tableau data visualization'
    },
  looker: {
      type: 'looker',
      label: 'Looker',
      icon: 'Eye',
      color: 'bg-purple-700',
      category: 'analytics',
      inputs: 1,
      outputs: 1,
      description: 'Looker business intelligence'
    },
  datadog: {
      type: 'datadog',
      label: 'Datadog',
      icon: 'Activity',
      color: 'bg-purple-600',
      category: 'analytics',
      inputs: 1,
      outputs: 1,
      description: 'Datadog monitoring and analytics'
    },
  ga4: { type: 'ga4', label: 'Google Analytics 4', icon: 'BarChart', color: 'bg-orange-600', category: 'analytics', inputs: 1, outputs: 1, description: 'GA4 analytics' },
  mailerlite: { type: 'mailerlite', label: 'MailerLite', icon: 'Mail', color: 'bg-emerald-600', category: 'marketing', inputs: 1, outputs: 1, description: 'Email marketing' },

  // Additional Analytics & Monitoring (n8n parity 2025)
  metabase: {
    type: 'metabase',
    label: 'Metabase',
    icon: 'Database',
    color: 'bg-blue-600',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Open source business intelligence'
  },
  posthog: {
    type: 'posthog',
    label: 'PostHog',
    icon: 'Radar',
    color: 'bg-blue-700',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Product analytics platform'
  },
  newRelic: {
    type: 'newRelic',
    label: 'New Relic',
    icon: 'Activity',
    color: 'bg-teal-600',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Application performance monitoring'
  },
  grafana: {
    type: 'grafana',
    label: 'Grafana',
    icon: 'LineChart',
    color: 'bg-orange-600',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Observability and dashboards'
  },
  powerBi: {
    type: 'powerBi',
    label: 'Power BI',
    icon: 'BarChart2',
    color: 'bg-yellow-600',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Microsoft business analytics'
  },
  sentry: {
    type: 'sentry',
    label: 'Sentry',
    icon: 'AlertTriangle',
    color: 'bg-purple-700',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Error tracking and monitoring'
  },
  prometheus: {
    type: 'prometheus',
    label: 'Prometheus',
    icon: 'Activity',
    color: 'bg-red-600',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Monitoring and alerting toolkit'
  },
  heap: {
    type: 'heap',
    label: 'Heap',
    icon: 'Layers',
    color: 'bg-indigo-600',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Digital insights platform'
  },
  fullstory: {
    type: 'fullstory',
    label: 'FullStory',
    icon: 'Film',
    color: 'bg-purple-600',
    category: 'analytics',
    inputs: 1,
    outputs: 1,
    description: 'Digital experience analytics'
  }
};
