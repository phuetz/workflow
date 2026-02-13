import { NodeType } from '../../types/workflow';

export const FINANCE_NODES: Record<string, NodeType> = {
  coinbase: {
      type: 'coinbase',
      label: 'Coinbase',
      icon: 'DollarSign',
      color: 'bg-blue-600',
      category: 'crypto',
      inputs: 1,
      outputs: 1,
      description: 'Coinbase cryptocurrency'
    },
  binance: {
      type: 'binance',
      label: 'Binance',
      icon: 'TrendingUp',
      color: 'bg-yellow-500',
      category: 'crypto',
      inputs: 1,
      outputs: 1,
      description: 'Binance exchange'
    },
  quickbooks: {
      type: 'quickbooks',
      label: 'QuickBooks Online',
      icon: 'DollarSign',
      color: 'bg-green-600',
      category: 'accounting',
      inputs: 1,
      outputs: 1,
      description: 'QuickBooks accounting and invoicing'
    },
  xero: {
      type: 'xero',
      label: 'Xero',
      icon: 'Calculator',
      color: 'bg-blue-500',
      category: 'accounting',
      inputs: 1,
      outputs: 1,
      description: 'Xero accounting software'
    },
  freshbooks: {
      type: 'freshbooks',
      label: 'FreshBooks',
      icon: 'FileText',
      color: 'bg-orange-500',
      category: 'accounting',
      inputs: 1,
      outputs: 1,
      description: 'FreshBooks invoicing and time tracking'
    },
  wave: {
      type: 'wave',
      label: 'Wave',
      icon: 'TrendingUp',
      color: 'bg-teal-500',
      category: 'accounting',
      inputs: 1,
      outputs: 1,
      description: 'Wave accounting software'
    },
  stripePayments: {
      type: 'stripePayments',
      label: 'Stripe Payments',
      icon: 'CreditCard',
      color: 'bg-purple-700',
      category: 'finance',
      inputs: 1,
      outputs: 1,
      description: 'Stripe (subscriptions, invoices)'
    },
  paypalPayments: {
      type: 'paypalPayments',
      label: 'PayPal Payments',
      icon: 'DollarSign',
      color: 'bg-blue-700',
      category: 'finance',
      inputs: 1,
      outputs: 1,
      description: 'PayPal (payouts, disputes)'
    },
  braintree: {
      type: 'braintree',
      label: 'Braintree',
      icon: 'CreditCard',
      color: 'bg-blue-800',
      category: 'finance',
      inputs: 1,
      outputs: 1,
      description: 'Braintree payment processing'
    },
  adyen: {
      type: 'adyen',
      label: 'Adyen',
      icon: 'CreditCard',
      color: 'bg-green-700',
      category: 'finance',
      inputs: 1,
      outputs: 1,
      description: 'Adyen payment platform'
    },
  squarePayments: {
      type: 'squarePayments',
      label: 'Square Payments',
      icon: 'Square',
      color: 'bg-gray-900',
      category: 'finance',
      inputs: 1,
      outputs: 1,
      description: 'Square payment transactions'
    },
  klarna: {
      type: 'klarna',
      label: 'Klarna',
      icon: 'ShoppingBag',
      color: 'bg-pink-600',
      category: 'finance',
      inputs: 1,
      outputs: 1,
      description: 'Klarna buy now pay later'
    },
  plaid: {
      type: 'plaid',
      label: 'Plaid',
      icon: 'Building',
      color: 'bg-gray-800',
      category: 'finance',
      inputs: 1,
      outputs: 1,
      description: 'Plaid banking data API'
    },
  dwolla: {
      type: 'dwolla',
      label: 'Dwolla',
      icon: 'ArrowRightLeft',
      color: 'bg-orange-600',
      category: 'finance',
      inputs: 1,
      outputs: 1,
      description: 'Dwolla ACH transfers'
    },
  mollie: {
      type: 'mollie',
      label: 'Mollie',
      icon: 'CreditCard',
      color: 'bg-blue-600',
      category: 'finance',
      inputs: 1,
      outputs: 1,
      description: 'Mollie European payments'
    },
  twocheckout: {
      type: 'twocheckout',
      label: '2Checkout',
      icon: 'Globe',
      color: 'bg-green-600',
      category: 'finance',
      inputs: 1,
      outputs: 1,
      description: '2Checkout global payments'
    },
  sage: { type: 'sage', label: 'Sage', icon: 'FileText', color: 'bg-green-600', category: 'accounting', inputs: 1, outputs: 1, description: 'Accounting software' },
    netsuite: { type: 'netsuite', label: 'NetSuite', icon: 'Briefcase', color: 'bg-orange-600', category: 'accounting', inputs: 1, outputs: 1, description: 'ERP system' },
  sap: { type: 'sap', label: 'SAP', icon: 'Layers', color: 'bg-blue-600', category: 'accounting', inputs: 1, outputs: 1, description: 'Enterprise software' },
    oracleerp: { type: 'oracleerp', label: 'Oracle ERP', icon: 'Database', color: 'bg-red-600', category: 'accounting', inputs: 1, outputs: 1, description: 'Oracle ERP Cloud' },
  odoo: { type: 'odoo', label: 'Odoo', icon: 'Package', color: 'bg-purple-600', category: 'accounting', inputs: 1, outputs: 1, description: 'Open-source ERP' },
    microsoftdynamics: { type: 'microsoftdynamics', label: 'Microsoft Dynamics', icon: 'Grid', color: 'bg-blue-700', category: 'accounting', inputs: 1, outputs: 1, description: 'Business applications' },
  zohobooks: { type: 'zohobooks', label: 'Zoho Books', icon: 'Book', color: 'bg-orange-600', category: 'accounting', inputs: 1, outputs: 1, description: 'Accounting software' },
    zohoinventory: { type: 'zohoinventory', label: 'Zoho Inventory', icon: 'Package', color: 'bg-orange-600', category: 'accounting', inputs: 1, outputs: 1, description: 'Inventory management' },
  bill: { type: 'bill', label: 'Bill.com', icon: 'DollarSign', color: 'bg-cyan-600', category: 'accounting', inputs: 1, outputs: 1, description: 'AP/AR automation' },
    expensify: { type: 'expensify', label: 'Expensify', icon: 'Receipt', color: 'bg-green-600', category: 'accounting', inputs: 1, outputs: 1, description: 'Expense management' },
  ethereum: { type: 'ethereum', label: 'Ethereum', icon: 'Hexagon', color: 'bg-purple-600', category: 'crypto', inputs: 1, outputs: 1, description: 'Blockchain platform' },
    bitcoin: { type: 'bitcoin', label: 'Bitcoin', icon: 'Bitcoin', color: 'bg-orange-600', category: 'crypto', inputs: 1, outputs: 1, description: 'Cryptocurrency' },
  polygon: { type: 'polygon', label: 'Polygon', icon: 'Triangle', color: 'bg-purple-600', category: 'crypto', inputs: 1, outputs: 1, description: 'Layer 2 scaling' },
    solana: { type: 'solana', label: 'Solana', icon: 'Zap', color: 'bg-purple-600', category: 'crypto', inputs: 1, outputs: 1, description: 'Blockchain platform' },
  avalanche: { type: 'avalanche', label: 'Avalanche', icon: 'Mountain', color: 'bg-red-600', category: 'crypto', inputs: 1, outputs: 1, description: 'Blockchain platform' },
    bsc: { type: 'bsc', label: 'Binance Smart Chain', icon: 'Link', color: 'bg-yellow-500', category: 'crypto', inputs: 1, outputs: 1, description: 'BSC network' },
  kraken: { type: 'kraken', label: 'Kraken', icon: 'TrendingUp', color: 'bg-purple-600', category: 'crypto', inputs: 1, outputs: 1, description: 'Crypto exchange' },
    metamask: { type: 'metamask', label: 'MetaMask', icon: 'Wallet', color: 'bg-orange-600', category: 'crypto', inputs: 1, outputs: 1, description: 'Crypto wallet' }
};
