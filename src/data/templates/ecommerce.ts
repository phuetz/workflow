/**
 * Workflow Templates - ecommerce
 */

import type { WorkflowTemplate } from '../../types/templates';

export const ECOMMERCE_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'order-fulfillment-automation',
    name: 'Order Fulfillment Automation',
    description: 'Automatically process orders from your e-commerce platform, update inventory, and send shipping notifications.',
    category: 'ecommerce',
    subcategory: 'fulfillment',
    author: 'System',
    authorType: 'official',
    tags: ['ecommerce', 'orders', 'shipping', 'inventory', 'shopify'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'shopify_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'New Order Trigger',
            properties: {
              event: 'order_created'
            },
            credentials: ['shopifyApi']
          }
        },
        {
          id: 'check-inventory',
          type: 'code_javascript',
          position: { x: 300, y: 200 },
          data: {
            label: 'Check Inventory',
            properties: {
              code: `// Check if items are in stock
const allInStock = order.line_items.every(item => item.inventory_quantity > 0);
return [{...order, allInStock}];`
            }
          }
        },
        {
          id: 'shipstation-1',
          type: 'shipstation',
          position: { x: 500, y: 150 },
          data: {
            label: 'Create Shipment',
            properties: {
              operation: 'createOrder',
              orderNumber: '={{$input.order_number}}',
              customerEmail: '={{$input.email}}'
            },
            credentials: ['shipstationApi']
          }
        },
        {
          id: 'email-1',
          type: 'sendgrid',
          position: { x: 700, y: 150 },
          data: {
            label: 'Send Confirmation',
            properties: {
              to: '={{$input.email}}',
              subject: 'Your order #{{$input.order_number}} has shipped!',
              templateId: 'shipping-confirmation'
            },
            credentials: ['sendgridApi']
          }
        },
        {
          id: 'backorder-1',
          type: 'slack',
          position: { x: 500, y: 250 },
          data: {
            label: 'Backorder Alert',
            properties: {
              channel: '#fulfillment',
              text: 'Order #{{$input.order_number}} has items on backorder'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'check-inventory' },
        { id: 'e2', source: 'check-inventory', target: 'shipstation-1', sourceHandle: 'in-stock' },
        { id: 'e3', source: 'check-inventory', target: 'backorder-1', sourceHandle: 'out-of-stock' },
        { id: 'e4', source: 'shipstation-1', target: 'email-1' }
      ]
    },
    version: '1.2.0',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    downloads: 1432,
    rating: 4.9,
    reviewCount: 187,
    featured: true,
    requiredIntegrations: ['shopify_trigger', 'code_javascript', 'shipstation', 'sendgrid', 'slack'],
    requiredCredentials: ['shopifyApi', 'shipstationApi', 'sendgridApi', 'slackApi'],
    estimatedSetupTime: 30,
    documentation: {
      overview: 'Automate order fulfillment from checkout to delivery confirmation.',
      setup: [],
      usage: 'Automatically processes all new orders from Shopify.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'abandoned-cart-recovery',
    name: 'Abandoned Cart Recovery',
    description: 'Automatically send personalized emails to customers who abandoned their shopping carts to recover lost sales.',
    category: 'ecommerce',
    subcategory: 'marketing',
    author: 'System',
    authorType: 'official',
    tags: ['ecommerce', 'abandoned cart', 'email', 'recovery', 'conversion'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'shopify_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Cart Abandoned',
            properties: {
              event: 'cart_abandoned'
            },
            credentials: ['shopifyApi']
          }
        },
        {
          id: 'delay-1',
          type: 'delay',
          position: { x: 300, y: 200 },
          data: {
            label: 'Wait 1 Hour',
            properties: {
              delayType: 'fixed',
              duration: 3600
            }
          }
        },
        {
          id: 'check-cart',
          type: 'shopify',
          position: { x: 500, y: 200 },
          data: {
            label: 'Check Cart Status',
            properties: {
              operation: 'getCart',
              cartId: '={{$input.cart_id}}'
            },
            credentials: ['shopifyApi']
          }
        },
        {
          id: 'email-1',
          type: 'sendgrid',
          position: { x: 700, y: 200 },
          data: {
            label: 'Recovery Email',
            properties: {
              to: '={{$input.email}}',
              subject: 'You left something behind! Get 10% off',
              templateId: 'abandoned-cart-recovery',
              dynamicData: {
                firstName: '={{$input.firstName}}',
                cartUrl: '={{$input.cart_url}}',
                discountCode: 'COMEBACK10'
              }
            },
            credentials: ['sendgridApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'delay-1' },
        { id: 'e2', source: 'delay-1', target: 'check-cart' },
        { id: 'e3', source: 'check-cart', target: 'email-1', sourceHandle: 'still-abandoned' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date(),
    downloads: 987,
    rating: 4.6,
    reviewCount: 98,
    featured: true,
    requiredIntegrations: ['shopify_trigger', 'delay', 'shopify', 'sendgrid'],
    requiredCredentials: ['shopifyApi', 'sendgridApi'],
    estimatedSetupTime: 15,
    documentation: {
      overview: 'Recover lost sales with automated abandoned cart emails.',
      setup: [],
      usage: 'Automatically triggers when customers abandon their carts.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'inventory-alert-system',
    name: 'Inventory Alert System',
    description: 'Monitor inventory levels across products and automatically alert your team when stock runs low.',
    category: 'ecommerce',
    subcategory: 'inventory',
    author: 'System',
    authorType: 'official',
    tags: ['inventory', 'alerts', 'monitoring', 'ecommerce'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule_trigger',
          position: { x: 100, y: 200 },
          data: {
            label: 'Hourly Check',
            properties: {
              cron: '0 * * * *',
              timezone: 'UTC'
            }
          }
        },
        {
          id: 'shopify-1',
          type: 'shopify',
          position: { x: 300, y: 200 },
          data: {
            label: 'Get Inventory',
            properties: {
              operation: 'getProducts',
              fields: ['id', 'title', 'inventory_quantity']
            },
            credentials: ['shopifyApi']
          }
        },
        {
          id: 'filter-1',
          type: 'code_javascript',
          position: { x: 500, y: 200 },
          data: {
            label: 'Find Low Stock',
            properties: {
              code: `// Filter products with low inventory
return products.filter(p => p.inventory_quantity < 10 && p.inventory_quantity > 0);`
            }
          }
        },
        {
          id: 'slack-1',
          type: 'slack',
          position: { x: 700, y: 200 },
          data: {
            label: 'Low Stock Alert',
            properties: {
              channel: '#inventory',
              text: 'Low stock alert: {{$input.title}} has only {{$input.inventory_quantity}} units left!'
            },
            credentials: ['slackApi']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'shopify-1' },
        { id: 'e2', source: 'shopify-1', target: 'filter-1' },
        { id: 'e3', source: 'filter-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date(),
    downloads: 654,
    rating: 4.5,
    reviewCount: 67,
    featured: false,
    requiredIntegrations: ['schedule_trigger', 'shopify', 'code_javascript', 'slack'],
    requiredCredentials: ['shopifyApi', 'slackApi'],
    estimatedSetupTime: 10,
    documentation: {
      overview: 'Stay on top of inventory with automated low stock alerts.',
      setup: [],
      usage: 'Runs automatically every hour to check inventory levels.'
    },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  },
  {
    id: 'shopify-order-fulfillment',
    name: 'Shopify Order Fulfillment',
    description: 'Automatically process Shopify orders, update inventory, and notify shipping.',
    category: 'ecommerce',
    subcategory: 'orders',
    author: 'System',
    authorType: 'official',
    tags: ['shopify', 'orders', 'fulfillment', 'ecommerce'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'shopify_trigger', position: { x: 100, y: 200 }, data: { label: 'New Order', properties: { event: 'orders/create' }, credentials: ['shopifyApi'] } },
        { id: 'inventory-1', type: 'shopify', position: { x: 300, y: 200 }, data: { label: 'Update Inventory', properties: { operation: 'updateInventory' }, credentials: ['shopifyApi'] } },
        { id: 'ship-1', type: 'httpRequest', position: { x: 500, y: 200 }, data: { label: 'Notify Shipping', properties: { method: 'POST', url: 'https://shipping-api.com/orders' } } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'inventory-1' },
        { id: 'e2', source: 'inventory-1', target: 'ship-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-01'), updatedAt: new Date(), downloads: 0, rating: 4.8, reviewCount: 0, featured: true,
    requiredIntegrations: ['shopify_trigger', 'shopify', 'httpRequest'], requiredCredentials: ['shopifyApi'], estimatedSetupTime: 20,
    documentation: { overview: 'Automate Shopify order processing.', setup: [], usage: 'Triggers on new orders.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'woocommerce-abandoned-cart',
    name: 'WooCommerce Abandoned Cart Recovery',
    description: 'Send automated emails to recover abandoned shopping carts.',
    category: 'ecommerce',
    subcategory: 'marketing',
    author: 'System',
    authorType: 'official',
    tags: ['woocommerce', 'cart', 'recovery', 'email'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'woocommerce_trigger', position: { x: 100, y: 200 }, data: { label: 'Abandoned Cart', properties: { event: 'cart_abandoned' }, credentials: ['woocommerceApi'] } },
        { id: 'delay-1', type: 'delay', position: { x: 300, y: 200 }, data: { label: 'Wait 1 Hour', properties: { duration: 3600000 } } },
        { id: 'email-1', type: 'sendgrid', position: { x: 500, y: 200 }, data: { label: 'Recovery Email', properties: { templateId: 'cart-recovery' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'delay-1' },
        { id: 'e2', source: 'delay-1', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-02'), updatedAt: new Date(), downloads: 0, rating: 4.7, reviewCount: 0, featured: false,
    requiredIntegrations: ['woocommerce_trigger', 'delay', 'sendgrid'], requiredCredentials: ['woocommerceApi', 'sendgridApi'], estimatedSetupTime: 15,
    documentation: { overview: 'Recover lost sales with automated emails.', setup: [], usage: 'Triggers after cart abandonment.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'stripe-subscription-management',
    name: 'Stripe Subscription Management',
    description: 'Handle subscription lifecycle events including renewals, cancellations, and failed payments.',
    category: 'ecommerce',
    subcategory: 'payments',
    author: 'System',
    authorType: 'official',
    tags: ['stripe', 'subscription', 'payments', 'billing'],
    difficulty: 'intermediate',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'stripe_trigger', position: { x: 100, y: 200 }, data: { label: 'Subscription Event', properties: { events: ['customer.subscription.updated', 'invoice.payment_failed'] }, credentials: ['stripeApi'] } },
        { id: 'switch-1', type: 'switchCase', position: { x: 300, y: 200 }, data: { label: 'Route Event', properties: { field: '={{$input.type}}' } } },
        { id: 'email-renew', type: 'sendgrid', position: { x: 500, y: 100 }, data: { label: 'Renewal Notice', properties: { templateId: 'subscription-renewed' }, credentials: ['sendgridApi'] } },
        { id: 'email-fail', type: 'sendgrid', position: { x: 500, y: 300 }, data: { label: 'Payment Failed', properties: { templateId: 'payment-failed' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'switch-1' },
        { id: 'e2', source: 'switch-1', target: 'email-renew', sourceHandle: 'renewed' },
        { id: 'e3', source: 'switch-1', target: 'email-fail', sourceHandle: 'failed' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-03'), updatedAt: new Date(), downloads: 0, rating: 4.9, reviewCount: 0, featured: true,
    requiredIntegrations: ['stripe_trigger', 'switchCase', 'sendgrid'], requiredCredentials: ['stripeApi', 'sendgridApi'], estimatedSetupTime: 25,
    documentation: { overview: 'Complete subscription lifecycle management.', setup: [], usage: 'Handles all subscription events.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'product-review-request',
    name: 'Product Review Request',
    description: 'Send review requests after order delivery with incentives.',
    category: 'ecommerce',
    subcategory: 'marketing',
    author: 'System',
    authorType: 'official',
    tags: ['reviews', 'ecommerce', 'email', 'marketing'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'shopify_trigger', position: { x: 100, y: 200 }, data: { label: 'Order Delivered', properties: { event: 'fulfillments/create' }, credentials: ['shopifyApi'] } },
        { id: 'delay-1', type: 'delay', position: { x: 300, y: 200 }, data: { label: 'Wait 7 Days', properties: { duration: 604800000 } } },
        { id: 'email-1', type: 'sendgrid', position: { x: 500, y: 200 }, data: { label: 'Review Request', properties: { templateId: 'review-request' }, credentials: ['sendgridApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'delay-1' },
        { id: 'e2', source: 'delay-1', target: 'email-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-04'), updatedAt: new Date(), downloads: 0, rating: 4.6, reviewCount: 0, featured: false,
    requiredIntegrations: ['shopify_trigger', 'delay', 'sendgrid'], requiredCredentials: ['shopifyApi', 'sendgridApi'], estimatedSetupTime: 10,
    documentation: { overview: 'Automate review collection.', setup: [], usage: 'Sends after delivery.' }, screenshots: [], customizableFields: [], pricing: 'free'
  },
  {
    id: 'inventory-low-stock-alert',
    name: 'Low Stock Alert',
    description: 'Monitor inventory levels and alert when stock runs low.',
    category: 'ecommerce',
    subcategory: 'inventory',
    author: 'System',
    authorType: 'official',
    tags: ['inventory', 'alerts', 'stock', 'ecommerce'],
    difficulty: 'beginner',
    workflow: {
      nodes: [
        { id: 'trigger-1', type: 'schedule_trigger', position: { x: 100, y: 200 }, data: { label: 'Daily Check', properties: { cron: '0 9 * * *' } } },
        { id: 'shopify-1', type: 'shopify', position: { x: 300, y: 200 }, data: { label: 'Get Inventory', properties: { operation: 'getInventory' }, credentials: ['shopifyApi'] } },
        { id: 'filter-1', type: 'filter', position: { x: 500, y: 200 }, data: { label: 'Low Stock', properties: { condition: '={{$input.quantity < 10}}' } } },
        { id: 'slack-1', type: 'slack', position: { x: 700, y: 200 }, data: { label: 'Alert Team', properties: { channel: '#inventory' }, credentials: ['slackApi'] } }
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'shopify-1' },
        { id: 'e2', source: 'shopify-1', target: 'filter-1' },
        { id: 'e3', source: 'filter-1', target: 'slack-1' }
      ]
    },
    version: '1.0.0', createdAt: new Date('2024-07-05'), updatedAt: new Date(), downloads: 0, rating: 4.7, reviewCount: 0, featured: false,
    requiredIntegrations: ['schedule_trigger', 'shopify', 'filter', 'slack'], requiredCredentials: ['shopifyApi', 'slackApi'], estimatedSetupTime: 15,
    documentation: { overview: 'Never run out of stock.', setup: [], usage: 'Runs daily inventory check.' }, screenshots: [], customizableFields: [], pricing: 'free'
  }
];
