import { TrendingUp, Users, Zap, Clock } from 'lucide-react';
import { TemplateCategory, IntelligentTemplate } from './types';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'business',
    name: 'Business Automation',
    icon: TrendingUp,
    color: '#3B82F6',
    description: 'Automatisation des processus metier'
  },
  {
    id: 'communication',
    name: 'Communication',
    icon: Users,
    color: '#10B981',
    description: 'Integrations email, chat, notifications'
  },
  {
    id: 'data',
    name: 'Data Processing',
    icon: Zap,
    color: '#8B5CF6',
    description: 'Traitement et analyse de donnees'
  },
  {
    id: 'monitoring',
    name: 'Monitoring & Alerts',
    icon: Clock,
    color: '#F59E0B',
    description: 'Surveillance et alertes automatiques'
  }
];

export const INTELLIGENT_TEMPLATES: IntelligentTemplate[] = [
  {
    id: 'ai-customer-support',
    name: 'AI Customer Support Pipeline',
    description: 'Pipeline automatise de support client avec IA pour classification et reponses',
    category: 'business',
    difficulty: 'advanced',
    estimatedTime: 30,
    popularity: 95,
    aiGenerated: true,
    optimizationScore: 92,
    estimatedCost: 25,
    reliability: 98,
    useCases: [
      'Support client 24/7',
      'Classification automatique des tickets',
      'Reponses automatisees intelligentes',
      'Escalade automatique des cas complexes'
    ],
    requirements: [
      'Cle API OpenAI',
      'Integration email/chat',
      'Base de donnees tickets',
      'Systeme de notification'
    ],
    benefits: [
      'Reduction de 80% du temps de reponse',
      'Satisfaction client amelioree',
      'Couts de support reduits',
      'Disponibilite 24/7'
    ],
    tags: ['AI', 'Customer Support', 'Automation', 'NLP'],
    nodes: [
      {
        id: 'trigger-email',
        type: 'custom',
        position: { x: 50, y: 100 },
        data: {
          id: 'trigger-email',
          type: 'email',
          label: 'Email Trigger',
          icon: 'mail',
          color: '#3B82F6',
          inputs: 0,
          outputs: 1,
          position: { x: 50, y: 100 },
          config: {
            provider: 'gmail',
            folder: 'inbox',
            filters: ['support@', 'help@']
          }
        }
      },
      {
        id: 'ai-classifier',
        type: 'custom',
        position: { x: 300, y: 100 },
        data: {
          id: 'ai-classifier',
          type: 'openai',
          label: 'AI Classifier',
          icon: 'bot',
          color: '#10B981',
          inputs: 1,
          outputs: 3,
          position: { x: 300, y: 100 },
          config: {
            model: 'gpt-4',
            prompt: 'Classify the following support ticket: urgent/normal/low priority',
            temperature: 0.1
          }
        }
      },
      {
        id: 'auto-response',
        type: 'custom',
        position: { x: 550, y: 50 },
        data: {
          id: 'auto-response',
          type: 'email',
          label: 'Auto Response',
          icon: 'send',
          color: '#8B5CF6',
          inputs: 1,
          outputs: 1,
          position: { x: 550, y: 50 },
          config: {
            template: 'auto-reply',
            personalized: true
          }
        }
      },
      {
        id: 'human-escalation',
        type: 'custom',
        position: { x: 550, y: 150 },
        data: {
          id: 'human-escalation',
          type: 'slack',
          label: 'Human Escalation',
          icon: 'users',
          color: '#F59E0B',
          inputs: 1,
          outputs: 1,
          position: { x: 550, y: 150 },
          config: {
            channel: '#support-team',
            urgency: 'high'
          }
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'trigger-email',
        target: 'ai-classifier',
        animated: true,
        style: { stroke: '#3B82F6', strokeWidth: 2 }
      },
      {
        id: 'e2',
        source: 'ai-classifier',
        target: 'auto-response',
        animated: true,
        style: { stroke: '#10B981', strokeWidth: 2 },
        data: { condition: 'priority === "low" || priority === "normal"' }
      },
      {
        id: 'e3',
        source: 'ai-classifier',
        target: 'human-escalation',
        animated: true,
        style: { stroke: '#F59E0B', strokeWidth: 2 },
        data: { condition: 'priority === "urgent"' }
      }
    ]
  },
  {
    id: 'smart-data-pipeline',
    name: 'Smart Data Processing Pipeline',
    description: 'Pipeline intelligent de traitement de donnees avec validation et optimisation automatique',
    category: 'data',
    difficulty: 'intermediate',
    estimatedTime: 20,
    popularity: 88,
    aiGenerated: true,
    optimizationScore: 89,
    estimatedCost: 15,
    reliability: 95,
    useCases: [
      'ETL automatise',
      'Validation de donnees',
      'Detection d\'anomalies',
      'Transformation intelligente'
    ],
    requirements: [
      'Sources de donnees',
      'Base de donnees cible',
      'Regles de validation',
      'Systeme de monitoring'
    ],
    benefits: [
      'Qualite des donnees amelioree',
      'Traitement automatise',
      'Detection d\'erreurs proactive',
      'Scalabilite optimisee'
    ],
    tags: ['Data', 'ETL', 'Validation', 'Automation'],
    nodes: [
      {
        id: 'data-source',
        type: 'custom',
        position: { x: 50, y: 100 },
        data: {
          id: 'data-source',
          type: 'database',
          label: 'Data Source',
          icon: 'database',
          color: '#3B82F6',
          inputs: 0,
          outputs: 1,
          position: { x: 50, y: 100 },
          config: {
            connection: 'postgresql://localhost',
            query: 'SELECT * FROM raw_data WHERE created_at > NOW() - INTERVAL 1 HOUR',
            schedule: '*/15 * * * *'
          }
        }
      },
      {
        id: 'data-validator',
        type: 'custom',
        position: { x: 300, y: 100 },
        data: {
          id: 'data-validator',
          type: 'transform',
          label: 'Data Validator',
          icon: 'check-circle',
          color: '#10B981',
          inputs: 1,
          outputs: 2,
          position: { x: 300, y: 100 },
          config: {
            rules: [
              { field: 'email', type: 'email' },
              { field: 'age', type: 'number', min: 0, max: 120 },
              { field: 'created_at', type: 'date', required: true }
            ],
            onError: 'quarantine'
          }
        }
      },
      {
        id: 'data-transformer',
        type: 'custom',
        position: { x: 550, y: 50 },
        data: {
          id: 'data-transformer',
          type: 'transform',
          label: 'Data Transformer',
          icon: 'refresh-cw',
          color: '#8B5CF6',
          inputs: 1,
          outputs: 1,
          position: { x: 550, y: 50 },
          config: {
            operations: [
              { type: 'normalize', field: 'email' },
              { type: 'format', field: 'phone', pattern: '+1-XXX-XXX-XXXX' },
              { type: 'enrich', field: 'location', service: 'geocoding' }
            ]
          }
        }
      },
      {
        id: 'error-handler',
        type: 'custom',
        position: { x: 550, y: 200 },
        data: {
          id: 'error-handler',
          type: 'email',
          label: 'Error Handler',
          icon: 'alert-triangle',
          color: '#F59E0B',
          inputs: 1,
          outputs: 1,
          position: { x: 550, y: 200 },
          config: {
            recipient: 'data-team@company.com',
            template: 'data-validation-error',
            severity: 'medium'
          }
        }
      },
      {
        id: 'data-warehouse',
        type: 'custom',
        position: { x: 800, y: 50 },
        data: {
          id: 'data-warehouse',
          type: 'database',
          label: 'Data Warehouse',
          icon: 'building',
          color: '#6B7280',
          inputs: 1,
          outputs: 0,
          position: { x: 800, y: 50 },
          config: {
            connection: 'snowflake://warehouse.company.com',
            table: 'processed_data',
            batchSize: 1000,
            upsertKey: 'id'
          }
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'data-source',
        target: 'data-validator',
        animated: true,
        style: { stroke: '#3B82F6', strokeWidth: 2 }
      },
      {
        id: 'e2',
        source: 'data-validator',
        target: 'data-transformer',
        animated: true,
        style: { stroke: '#10B981', strokeWidth: 2 },
        data: { condition: 'validation === "success"' }
      },
      {
        id: 'e3',
        source: 'data-validator',
        target: 'error-handler',
        animated: true,
        style: { stroke: '#F59E0B', strokeWidth: 2 },
        data: { condition: 'validation === "error"' }
      },
      {
        id: 'e4',
        source: 'data-transformer',
        target: 'data-warehouse',
        animated: true,
        style: { stroke: '#8B5CF6', strokeWidth: 2 }
      }
    ]
  },
  {
    id: 'intelligent-monitoring',
    name: 'Intelligent System Monitoring',
    description: 'Systeme de monitoring intelligent avec prediction d\'incidents et auto-remediation',
    category: 'monitoring',
    difficulty: 'advanced',
    estimatedTime: 45,
    popularity: 92,
    aiGenerated: true,
    optimizationScore: 94,
    estimatedCost: 30,
    reliability: 97,
    useCases: [
      'Monitoring proactif',
      'Prediction d\'incidents',
      'Auto-remediation',
      'Alertes intelligentes'
    ],
    requirements: [
      'Metriques systeme',
      'Logs d\'application',
      'Modeles de ML',
      'Systeme d\'alertes'
    ],
    benefits: [
      'Prevention des incidents',
      'Reduction des downtimes',
      'Optimisation des performances',
      'Couts operationnels reduits'
    ],
    tags: ['Monitoring', 'AI', 'Prediction', 'Auto-healing'],
    nodes: [
      {
        id: 'metrics-collector',
        type: 'custom',
        position: { x: 50, y: 100 },
        data: {
          id: 'metrics-collector',
          type: 'httpRequest',
          label: 'Metrics Collector',
          icon: 'bar-chart',
          color: '#3B82F6',
          inputs: 0,
          outputs: 1,
          position: { x: 50, y: 100 },
          config: {
            sources: [
              'http://prometheus:9090/api/v1/query',
              'http://grafana:3000/api/metrics',
              '/var/log/application.log'
            ],
            interval: '30s',
            metrics: ['cpu_usage', 'memory_usage', 'disk_io', 'network_latency']
          }
        }
      },
      {
        id: 'anomaly-detector',
        type: 'custom',
        position: { x: 300, y: 100 },
        data: {
          id: 'anomaly-detector',
          type: 'openai',
          label: 'AI Anomaly Detector',
          icon: 'search',
          color: '#10B981',
          inputs: 1,
          outputs: 2,
          position: { x: 300, y: 100 },
          config: {
            model: 'gpt-4',
            algorithm: 'isolation_forest',
            threshold: 0.85,
            lookback: '5m',
            features: ['cpu', 'memory', 'network', 'errors']
          }
        }
      },
      {
        id: 'incident-predictor',
        type: 'custom',
        position: { x: 550, y: 50 },
        data: {
          id: 'incident-predictor',
          type: 'computation',
          label: 'Incident Predictor',
          icon: 'crystal-ball',
          color: '#8B5CF6',
          inputs: 1,
          outputs: 2,
          position: { x: 550, y: 50 },
          config: {
            model: 'lstm_predictor',
            prediction_window: '15m',
            confidence_threshold: 0.8,
            factors: ['trend', 'seasonality', 'historical_incidents']
          }
        }
      },
      {
        id: 'auto-remediation',
        type: 'custom',
        position: { x: 800, y: 50 },
        data: {
          id: 'auto-remediation',
          type: 'script',
          label: 'Auto Remediation',
          icon: 'wrench',
          color: '#F59E0B',
          inputs: 1,
          outputs: 1,
          position: { x: 800, y: 50 },
          config: {
            actions: [
              { condition: 'high_cpu', action: 'scale_up_pods' },
              { condition: 'memory_leak', action: 'restart_service' },
              { condition: 'disk_full', action: 'cleanup_logs' }
            ],
            safety_checks: true,
            rollback_enabled: true
          }
        }
      },
      {
        id: 'alert-manager',
        type: 'custom',
        position: { x: 550, y: 200 },
        data: {
          id: 'alert-manager',
          type: 'slack',
          label: 'Alert Manager',
          icon: 'bell',
          color: '#EF4444',
          inputs: 2,
          outputs: 1,
          position: { x: 550, y: 200 },
          config: {
            channels: ['#alerts', '#ops-team'],
            escalation: [
              { level: 1, delay: '5m', notify: 'on-call' },
              { level: 2, delay: '15m', notify: 'manager' },
              { level: 3, delay: '30m', notify: 'director' }
            ],
            severity_mapping: {
              'critical': '#critical-alerts',
              'warning': '#general-alerts'
            }
          }
        }
      },
      {
        id: 'dashboard-updater',
        type: 'custom',
        position: { x: 800, y: 150 },
        data: {
          id: 'dashboard-updater',
          type: 'httpRequest',
          label: 'Dashboard Updater',
          icon: 'trending-up',
          color: '#6B7280',
          inputs: 1,
          outputs: 0,
          position: { x: 800, y: 150 },
          config: {
            dashboard_url: 'http://grafana:3000/api/dashboards',
            update_panels: ['system-health', 'predictions', 'incidents'],
            real_time: true
          }
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'metrics-collector',
        target: 'anomaly-detector',
        animated: true,
        style: { stroke: '#3B82F6', strokeWidth: 2 }
      },
      {
        id: 'e2',
        source: 'anomaly-detector',
        target: 'incident-predictor',
        animated: true,
        style: { stroke: '#10B981', strokeWidth: 2 },
        data: { condition: 'anomaly_detected === true' }
      },
      {
        id: 'e3',
        source: 'anomaly-detector',
        target: 'alert-manager',
        animated: true,
        style: { stroke: '#EF4444', strokeWidth: 2 },
        data: { condition: 'severity >= "warning"' }
      },
      {
        id: 'e4',
        source: 'incident-predictor',
        target: 'auto-remediation',
        animated: true,
        style: { stroke: '#8B5CF6', strokeWidth: 2 },
        data: { condition: 'prediction_confidence > 0.8' }
      },
      {
        id: 'e5',
        source: 'incident-predictor',
        target: 'alert-manager',
        animated: true,
        style: { stroke: '#F59E0B', strokeWidth: 2 },
        data: { condition: 'incident_predicted === true' }
      },
      {
        id: 'e6',
        source: 'auto-remediation',
        target: 'dashboard-updater',
        animated: true,
        style: { stroke: '#6B7280', strokeWidth: 2 }
      }
    ]
  },
  {
    id: 'email-marketing-automation',
    name: 'Email Marketing Automation',
    description: 'Pipeline automatise de marketing email avec segmentation et personnalisation',
    category: 'communication',
    difficulty: 'intermediate',
    estimatedTime: 25,
    popularity: 90,
    aiGenerated: false,
    optimizationScore: 87,
    estimatedCost: 20,
    reliability: 94,
    useCases: [
      'Campagnes email automatisees',
      'Segmentation d\'audience',
      'Personnalisation de contenu',
      'Suivi des performances'
    ],
    requirements: [
      'Liste de contacts',
      'Service email (SendGrid/Mailchimp)',
      'Templates d\'email',
      'Analytics tracking'
    ],
    benefits: [
      'Engagement client ameliore',
      'Conversion automatisee',
      'Personnalisation a grande echelle',
      'ROI optimise'
    ],
    tags: ['Email', 'Marketing', 'Automation', 'Personalization'],
    nodes: [
      {
        id: 'contact-segmenter',
        type: 'custom',
        position: { x: 50, y: 100 },
        data: {
          id: 'contact-segmenter',
          type: 'database',
          label: 'Contact Segmenter',
          icon: 'users',
          color: '#3B82F6',
          inputs: 0,
          outputs: 3,
          position: { x: 50, y: 100 },
          config: {
            segments: [
              { name: 'new_customers', criteria: 'signup_date > 7_days_ago' },
              { name: 'active_users', criteria: 'last_login < 30_days_ago' },
              { name: 'churned_users', criteria: 'last_login > 90_days_ago' }
            ]
          }
        }
      },
      {
        id: 'content-personalizer',
        type: 'custom',
        position: { x: 300, y: 50 },
        data: {
          id: 'content-personalizer',
          type: 'openai',
          label: 'Content Personalizer',
          icon: 'sparkles',
          color: '#10B981',
          inputs: 1,
          outputs: 1,
          position: { x: 300, y: 50 },
          config: {
            model: 'gpt-4',
            personalization_fields: ['name', 'location', 'preferences', 'purchase_history'],
            templates: {
              'welcome': 'Welcome {{name}}! Based in {{location}}, you might like...',
              'reengagement': 'We miss you {{name}}! Here\'s what\'s new...'
            }
          }
        }
      },
      {
        id: 'email-sender',
        type: 'custom',
        position: { x: 550, y: 100 },
        data: {
          id: 'email-sender',
          type: 'email',
          label: 'Email Sender',
          icon: 'mail',
          color: '#8B5CF6',
          inputs: 1,
          outputs: 1,
          position: { x: 550, y: 100 },
          config: {
            provider: 'sendgrid',
            rate_limit: '100/hour',
            tracking: true,
            unsubscribe_link: true
          }
        }
      },
      {
        id: 'analytics-tracker',
        type: 'custom',
        position: { x: 800, y: 100 },
        data: {
          id: 'analytics-tracker',
          type: 'httpRequest',
          label: 'Analytics Tracker',
          icon: 'bar-chart',
          color: '#F59E0B',
          inputs: 1,
          outputs: 0,
          position: { x: 800, y: 100 },
          config: {
            metrics: ['open_rate', 'click_rate', 'conversion_rate', 'unsubscribe_rate'],
            dashboard: 'google_analytics',
            real_time: true
          }
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'contact-segmenter',
        target: 'content-personalizer',
        animated: true,
        style: { stroke: '#3B82F6', strokeWidth: 2 }
      },
      {
        id: 'e2',
        source: 'content-personalizer',
        target: 'email-sender',
        animated: true,
        style: { stroke: '#10B981', strokeWidth: 2 }
      },
      {
        id: 'e3',
        source: 'email-sender',
        target: 'analytics-tracker',
        animated: true,
        style: { stroke: '#8B5CF6', strokeWidth: 2 }
      }
    ]
  },
  {
    id: 'order-processing-automation',
    name: 'Order Processing Automation',
    description: 'Systeme automatise de traitement des commandes avec validation et fulfillment',
    category: 'business',
    difficulty: 'advanced',
    estimatedTime: 40,
    popularity: 93,
    aiGenerated: true,
    optimizationScore: 91,
    estimatedCost: 35,
    reliability: 96,
    useCases: [
      'Traitement automatique des commandes',
      'Validation des paiements',
      'Gestion des stocks',
      'Notifications clients'
    ],
    requirements: [
      'Systeme de commandes',
      'Gateway de paiement',
      'Gestion d\'inventaire',
      'Service de notifications'
    ],
    benefits: [
      'Traitement 24/7',
      'Reduction des erreurs',
      'Delais de livraison optimises',
      'Satisfaction client amelioree'
    ],
    tags: ['E-commerce', 'Automation', 'Payment', 'Fulfillment'],
    nodes: [
      {
        id: 'order-receiver',
        type: 'custom',
        position: { x: 50, y: 100 },
        data: {
          id: 'order-receiver',
          type: 'webhook',
          label: 'Order Receiver',
          icon: 'shopping-cart',
          color: '#3B82F6',
          inputs: 0,
          outputs: 1,
          position: { x: 50, y: 100 },
          config: {
            endpoint: '/api/orders/webhook',
            authentication: 'jwt',
            validation: true
          }
        }
      },
      {
        id: 'payment-processor',
        type: 'custom',
        position: { x: 300, y: 100 },
        data: {
          id: 'payment-processor',
          type: 'httpRequest',
          label: 'Payment Processor',
          icon: 'credit-card',
          color: '#10B981',
          inputs: 1,
          outputs: 2,
          position: { x: 300, y: 100 },
          config: {
            provider: 'stripe',
            retry_attempts: 3,
            timeout: 30,
            fraud_check: true
          }
        }
      },
      {
        id: 'inventory-checker',
        type: 'custom',
        position: { x: 550, y: 50 },
        data: {
          id: 'inventory-checker',
          type: 'database',
          label: 'Inventory Checker',
          icon: 'package',
          color: '#8B5CF6',
          inputs: 1,
          outputs: 2,
          position: { x: 550, y: 50 },
          config: {
            query: 'SELECT quantity FROM inventory WHERE product_id = ?',
            reserve_stock: true,
            threshold_check: true
          }
        }
      },
      {
        id: 'fulfillment-center',
        type: 'custom',
        position: { x: 800, y: 50 },
        data: {
          id: 'fulfillment-center',
          type: 'httpRequest',
          label: 'Fulfillment Center',
          icon: 'truck',
          color: '#F59E0B',
          inputs: 1,
          outputs: 1,
          position: { x: 800, y: 50 },
          config: {
            warehouse_api: 'https://warehouse.company.com/api',
            priority_shipping: true,
            tracking_enabled: true
          }
        }
      },
      {
        id: 'customer-notifier',
        type: 'custom',
        position: { x: 1050, y: 100 },
        data: {
          id: 'customer-notifier',
          type: 'email',
          label: 'Customer Notifier',
          icon: 'mail-check',
          color: '#6B7280',
          inputs: 1,
          outputs: 0,
          position: { x: 1050, y: 100 },
          config: {
            templates: {
              'order_confirmed': 'Your order #{{order_id}} has been confirmed',
              'shipped': 'Your order has shipped! Track: {{tracking_number}}'
            }
          }
        }
      },
      {
        id: 'error-handler',
        type: 'custom',
        position: { x: 550, y: 200 },
        data: {
          id: 'error-handler',
          type: 'slack',
          label: 'Error Handler',
          icon: 'alert-triangle',
          color: '#EF4444',
          inputs: 2,
          outputs: 1,
          position: { x: 550, y: 200 },
          config: {
            channel: '#order-issues',
            escalation: true,
            auto_refund: false
          }
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'order-receiver',
        target: 'payment-processor',
        animated: true,
        style: { stroke: '#3B82F6', strokeWidth: 2 }
      },
      {
        id: 'e2',
        source: 'payment-processor',
        target: 'inventory-checker',
        animated: true,
        style: { stroke: '#10B981', strokeWidth: 2 },
        data: { condition: 'payment_status === "success"' }
      },
      {
        id: 'e3',
        source: 'payment-processor',
        target: 'error-handler',
        animated: true,
        style: { stroke: '#EF4444', strokeWidth: 2 },
        data: { condition: 'payment_status === "failed"' }
      },
      {
        id: 'e4',
        source: 'inventory-checker',
        target: 'fulfillment-center',
        animated: true,
        style: { stroke: '#8B5CF6', strokeWidth: 2 },
        data: { condition: 'stock_available === true' }
      },
      {
        id: 'e5',
        source: 'inventory-checker',
        target: 'error-handler',
        animated: true,
        style: { stroke: '#EF4444', strokeWidth: 2 },
        data: { condition: 'stock_available === false' }
      },
      {
        id: 'e6',
        source: 'fulfillment-center',
        target: 'customer-notifier',
        animated: true,
        style: { stroke: '#F59E0B', strokeWidth: 2 }
      }
    ]
  }
];
