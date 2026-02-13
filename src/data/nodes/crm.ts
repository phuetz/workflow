import { NodeType } from '../../types/workflow';

export const CRM_NODES: Record<string, NodeType> = {
  zendesk: {
      type: 'zendesk',
      label: 'Zendesk',
      icon: 'MessageSquare',
      color: 'bg-green-700',
      category: 'support',
      inputs: 1,
      outputs: 1,
      description: 'Zendesk support platform'
    },
  intercom: {
      type: 'intercom',
      label: 'Intercom',
      icon: 'MessageCircle',
      color: 'bg-blue-500',
      category: 'support',
      inputs: 1,
      outputs: 1,
      description: 'Intercom customer messaging'
    },
  zohocrm: {
      type: 'zohocrm',
      label: 'Zoho CRM',
      icon: 'Users',
      color: 'bg-red-600',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Zoho CRM platform'
    },
  freshsales: {
      type: 'freshsales',
      label: 'Freshsales',
      icon: 'UserCheck',
      color: 'bg-green-600',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Freshsales CRM'
    },
  copper: {
      type: 'copper',
      label: 'Copper',
      icon: 'Users',
      color: 'bg-orange-600',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Copper CRM for Google Workspace'
    },
  close: {
      type: 'close',
      label: 'Close',
      icon: 'Phone',
      color: 'bg-blue-600',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Close sales CRM'
    },
  freshdesk: {
      type: 'freshdesk',
      label: 'Freshdesk',
      icon: 'Headphones',
      color: 'bg-green-600',
      category: 'support',
      inputs: 1,
      outputs: 1,
      description: 'Freshdesk support platform'
    },
  servicenow: {
      type: 'servicenow',
      label: 'ServiceNow',
      icon: 'Settings',
      color: 'bg-blue-800',
      category: 'support',
      inputs: 1,
      outputs: 1,
      description: 'ServiceNow IT service management'
    },
  atlassianservice: {
      type: 'atlassianservice',
      label: 'Atlassian Service Desk',
      icon: 'HelpCircle',
      color: 'bg-blue-700',
      category: 'support',
      inputs: 1,
      outputs: 1,
      description: 'Atlassian service management'
    },
  helpscout: {
      type: 'helpscout',
      label: 'Help Scout',
      icon: 'LifeBuoy',
      color: 'bg-blue-600',
      category: 'support',
      inputs: 1,
      outputs: 1,
      description: 'Help Scout customer support'
    },
  crisp: {
      type: 'crisp',
      label: 'Crisp',
      icon: 'MessageCircle',
      color: 'bg-purple-600',
      category: 'support',
      inputs: 1,
      outputs: 1,
      description: 'Crisp customer messaging'
    },
  hubspotCRM: {
      type: 'hubspotCRM',
      label: 'HubSpot CRM',
      icon: 'Users',
      color: 'bg-orange-600',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'HubSpot CRM (deals, contacts, companies)'
    },
  pipedriveCRM: {
      type: 'pipedriveCRM',
      label: 'Pipedrive CRM',
      icon: 'Handshake',
      color: 'bg-green-700',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Pipedrive sales CRM'
    },
  salesforceCRM: {
      type: 'salesforceCRM',
      label: 'Salesforce CRM',
      icon: 'Cloud',
      color: 'bg-blue-600',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Salesforce CRM (opportunities, campaigns)'
    },
  zohoCRM: {
      type: 'zohoCRM',
      label: 'Zoho CRM',
      icon: 'Users',
      color: 'bg-red-700',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Zoho CRM platform'
    },
  freshsalesCRM: {
      type: 'freshsalesCRM',
      label: 'Freshsales',
      icon: 'UserCheck',
      color: 'bg-green-600',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Freshsales CRM by Freshworks'
    },
  closeCRM: {
      type: 'closeCRM',
      label: 'Close CRM',
      icon: 'Phone',
      color: 'bg-blue-700',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Close sales CRM'
    },
  copperCRM: {
      type: 'copperCRM',
      label: 'Copper CRM',
      icon: 'Users',
      color: 'bg-orange-700',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Copper CRM for Google Workspace'
    },
  insightlyCRM: {
      type: 'insightlyCRM',
      label: 'Insightly',
      icon: 'BarChart',
      color: 'bg-purple-600',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Insightly CRM and project management'
    },
  nimbleCRM: {
      type: 'nimbleCRM',
      label: 'Nimble CRM',
      icon: 'Users',
      color: 'bg-blue-500',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'Nimble social CRM'
    },
  sugarCRM: {
      type: 'sugarCRM',
      label: 'SugarCRM',
      icon: 'Briefcase',
      color: 'bg-red-600',
      category: 'crm',
      inputs: 1,
      outputs: 1,
      description: 'SugarCRM platform'
    },
  drift: { type: 'drift', label: 'Drift', icon: 'MessageCircle', color: 'bg-blue-600', category: 'support', inputs: 1, outputs: 1, description: 'Conversational marketing' },
    front: { type: 'front', label: 'Front', icon: 'Mail', color: 'bg-violet-600', category: 'support', inputs: 1, outputs: 1, description: 'Shared inbox' },
  gorgias: { type: 'gorgias', label: 'Gorgias', icon: 'Headphones', color: 'bg-purple-600', category: 'support', inputs: 1, outputs: 1, description: 'E-commerce support' },
    kustomer: { type: 'kustomer', label: 'Kustomer', icon: 'Users', color: 'bg-pink-600', category: 'support', inputs: 1, outputs: 1, description: 'CRM platform' },
  reamaze: { type: 'reamaze', label: 'Re:amaze', icon: 'Headphones', color: 'bg-teal-600', category: 'support', inputs: 1, outputs: 1, description: 'Customer messaging' },
    livechat: { type: 'livechat', label: 'LiveChat', icon: 'MessageSquare', color: 'bg-orange-600', category: 'support', inputs: 1, outputs: 1, description: 'Live chat software' },
  tawkto: { type: 'tawkto', label: 'Tawk.to', icon: 'MessageSquare', color: 'bg-green-600', category: 'support', inputs: 1, outputs: 1, description: 'Free live chat' },
    tidio: { type: 'tidio', label: 'Tidio', icon: 'MessageCircle', color: 'bg-blue-600', category: 'support', inputs: 1, outputs: 1, description: 'Live chat' },
  chatwoot: { type: 'chatwoot', label: 'Chatwoot', icon: 'MessageSquare', color: 'bg-emerald-600', category: 'support', inputs: 1, outputs: 1, description: 'Open-source support' },
    olark: { type: 'olark', label: 'Olark', icon: 'MessageCircle', color: 'bg-amber-600', category: 'support', inputs: 1, outputs: 1, description: 'Live chat' }
};
