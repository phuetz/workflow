import { NodeType } from '../../types/workflow';

export const CLOUD_NODES: Record<string, NodeType> = {
  aws: {
      type: 'aws',
      label: 'AWS',
      icon: 'Cloud',
      color: 'bg-orange-600',
      category: 'cloud',
      inputs: 1,
      outputs: 1,
      description: 'AWS services'
    },
  s3: {
      type: 's3',
      label: 'AWS S3',
      icon: 'Archive',
      color: 'bg-orange-700',
      category: 'cloud',
      inputs: 1,
      outputs: 1,
      description: 'AWS S3 storage'
    },
  lambda: {
      type: 'lambda',
      label: 'AWS Lambda',
      icon: 'Zap',
      color: 'bg-orange-500',
      category: 'cloud',
      inputs: 1,
      outputs: 1,
      description: 'AWS Lambda functions'
    },
  salesforce: {
      type: 'salesforce',
      label: 'Salesforce',
      icon: 'Cloud',
      color: 'bg-blue-600',
      category: 'saas',
      inputs: 1,
      outputs: 1,
      description: 'Salesforce CRM integration'
    },
  hubspot: {
      type: 'hubspot',
      label: 'HubSpot',
      icon: 'Users',
      color: 'bg-orange-500',
      category: 'saas',
      inputs: 1,
      outputs: 1,
      description: 'HubSpot CRM integration'
    },
  monday: {
      type: 'monday',
      label: 'Monday.com',
      icon: 'CalendarClock',
      color: 'bg-teal-500',
      category: 'saas',
      inputs: 1,
      outputs: 1,
      description: 'Monday.com project management'
    },
  asana: {
      type: 'asana',
      label: 'Asana',
      icon: 'ListTodo',
      color: 'bg-orange-400',
      category: 'saas',
      inputs: 1,
      outputs: 1,
      description: 'Asana project management',
    },
  clickup: {
      type: 'clickup',
      label: 'ClickUp',
      icon: 'CheckSquare',
      color: 'bg-purple-500',
      category: 'saas',
      inputs: 1,
      outputs: 1,
      description: 'ClickUp project management',
    },
  pipedrive: {
      type: 'pipedrive',
      label: 'Pipedrive',
      icon: 'Handshake',
      color: 'bg-green-600',
      category: 'saas',
      inputs: 1,
      outputs: 1,
      description: 'Pipedrive CRM integration'
    },
  dropbox: {
      type: 'dropbox',
      label: 'Dropbox',
      icon: 'Cloud',
      color: 'bg-blue-500',
      category: 'storage',
      inputs: 1,
      outputs: 1,
      description: 'Dropbox cloud storage'
    },
  onedrive: {
      type: 'onedrive',
      label: 'OneDrive',
      icon: 'HardDrive',
      color: 'bg-blue-600',
      category: 'storage',
      inputs: 1,
      outputs: 1,
      description: 'Microsoft OneDrive'
    },
  box: {
      type: 'box',
      label: 'Box',
      icon: 'Package',
      color: 'bg-blue-700',
      category: 'storage',
      inputs: 1,
      outputs: 1,
      description: 'Box cloud storage'
    },
  supabase: {
      type: 'supabase',
      label: 'Supabase',
      icon: 'Database',
      color: 'bg-green-600',
      category: 'baas',
      inputs: 1,
      outputs: 1,
      description: 'Supabase backend platform'
    },
  firebase: {
      type: 'firebase',
      label: 'Firebase',
      icon: 'Flame',
      color: 'bg-yellow-600',
      category: 'baas',
      inputs: 1,
      outputs: 1,
      description: 'Firebase backend services'
    },
  hasura: {
      type: 'hasura',
      label: 'Hasura',
      icon: 'Zap',
      color: 'bg-blue-400',
      category: 'baas',
      inputs: 1,
      outputs: 1,
      description: 'Hasura GraphQL engine'
    },
  strapiCMS: {
      type: 'strapiCMS',
      label: 'Strapi',
      icon: 'Layout',
      color: 'bg-purple-700',
      category: 'baas',
      inputs: 1,
      outputs: 1,
      description: 'Strapi headless CMS'
    },
  awsec2: { type: 'awsec2', label: 'AWS EC2', icon: 'Server', color: 'bg-orange-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Cloud compute' },
    awscloudwatch: { type: 'awscloudwatch', label: 'AWS CloudWatch', icon: 'Activity', color: 'bg-orange-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Monitoring service' },
  googlecloudfunctions: { type: 'googlecloudfunctions', label: 'Cloud Functions', icon: 'Zap', color: 'bg-blue-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Serverless functions' },
    googlecloudrun: { type: 'googlecloudrun', label: 'Cloud Run', icon: 'Play', color: 'bg-blue-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Container platform' },
  azurefunctions: { type: 'azurefunctions', label: 'Azure Functions', icon: 'Zap', color: 'bg-blue-700', category: 'cloud', inputs: 1, outputs: 1, description: 'Serverless compute' },
    azureappservice: { type: 'azureappservice', label: 'Azure App Service', icon: 'Globe', color: 'bg-blue-700', category: 'cloud', inputs: 1, outputs: 1, description: 'Web apps' },
  vercel: { type: 'vercel', label: 'Vercel', icon: 'Triangle', color: 'bg-black', category: 'cloud', inputs: 1, outputs: 1, description: 'Frontend cloud' },
    netlify: { type: 'netlify', label: 'Netlify', icon: 'Globe', color: 'bg-teal-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Web platform' },
  digitalocean: { type: 'digitalocean', label: 'DigitalOcean', icon: 'Droplet', color: 'bg-blue-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Cloud infrastructure' },
    linode: { type: 'linode', label: 'Linode', icon: 'Server', color: 'bg-green-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Cloud platform' },
  vultr: { type: 'vultr', label: 'Vultr', icon: 'Cloud', color: 'bg-blue-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Cloud compute' },
    cloudflareworkers: { type: 'cloudflareworkers', label: 'Cloudflare Workers', icon: 'Zap', color: 'bg-orange-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Edge computing' },
  heroku: { type: 'heroku', label: 'Heroku', icon: 'Box', color: 'bg-purple-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Cloud platform' },
    render: { type: 'render', label: 'Render', icon: 'Box', color: 'bg-purple-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Cloud platform' },
  flyio: { type: 'flyio', label: 'Fly.io', icon: 'Plane', color: 'bg-purple-600', category: 'cloud', inputs: 1, outputs: 1, description: 'Edge platform' },

  // Additional Cloud & Deployment (n8n parity 2025)
  railway: {
    type: 'railway',
    label: 'Railway',
    icon: 'Train',
    color: 'bg-purple-700',
    category: 'cloud',
    inputs: 1,
    outputs: 1,
    description: 'Infrastructure platform for developers'
  },
  koyeb: {
    type: 'koyeb',
    label: 'Koyeb',
    icon: 'Globe',
    color: 'bg-orange-600',
    category: 'cloud',
    inputs: 1,
    outputs: 1,
    description: 'Serverless platform'
  },

  // Auth & Identity Providers (n8n parity 2025)
  auth0: {
    type: 'auth0',
    label: 'Auth0',
    icon: 'Lock',
    color: 'bg-orange-600',
    category: 'auth',
    inputs: 1,
    outputs: 1,
    description: 'Identity platform'
  },
  okta: {
    type: 'okta',
    label: 'Okta',
    icon: 'Shield',
    color: 'bg-blue-700',
    category: 'auth',
    inputs: 1,
    outputs: 1,
    description: 'Identity and access management'
  },
  clerk: {
    type: 'clerk',
    label: 'Clerk',
    icon: 'UserCheck',
    color: 'bg-purple-600',
    category: 'auth',
    inputs: 1,
    outputs: 1,
    description: 'Authentication and user management'
  },
  onelogin: {
    type: 'onelogin',
    label: 'OneLogin',
    icon: 'Key',
    color: 'bg-blue-600',
    category: 'auth',
    inputs: 1,
    outputs: 1,
    description: 'Identity and access management'
  },
  ping: {
    type: 'ping',
    label: 'Ping Identity',
    icon: 'Shield',
    color: 'bg-red-600',
    category: 'auth',
    inputs: 1,
    outputs: 1,
    description: 'Enterprise identity security'
  },
  keycloak: {
    type: 'keycloak',
    label: 'Keycloak',
    icon: 'Key',
    color: 'bg-gray-700',
    category: 'auth',
    inputs: 1,
    outputs: 1,
    description: 'Open source identity management'
  },

  // CMS & Content Platforms (n8n parity 2025)
  ghost: {
    type: 'ghost',
    label: 'Ghost',
    icon: 'FileText',
    color: 'bg-black',
    category: 'cms',
    inputs: 1,
    outputs: 1,
    description: 'Professional publishing platform'
  },
  medium: {
    type: 'medium',
    label: 'Medium',
    icon: 'BookOpen',
    color: 'bg-black',
    category: 'cms',
    inputs: 1,
    outputs: 1,
    description: 'Publishing platform'
  },
  webflow: {
    type: 'webflow',
    label: 'Webflow',
    icon: 'Layout',
    color: 'bg-blue-700',
    category: 'cms',
    inputs: 1,
    outputs: 1,
    description: 'Visual web development platform'
  },
  contentful: {
    type: 'contentful',
    label: 'Contentful',
    icon: 'Database',
    color: 'bg-blue-600',
    category: 'cms',
    inputs: 1,
    outputs: 1,
    description: 'Headless CMS'
  },
  sanity: {
    type: 'sanity',
    label: 'Sanity',
    icon: 'File',
    color: 'bg-red-600',
    category: 'cms',
    inputs: 1,
    outputs: 1,
    description: 'Headless CMS platform'
  },
  prismic: {
    type: 'prismic',
    label: 'Prismic',
    icon: 'Layers',
    color: 'bg-gray-800',
    category: 'cms',
    inputs: 1,
    outputs: 1,
    description: 'Headless CMS'
  },
  directus: {
    type: 'directus',
    label: 'Directus',
    icon: 'Database',
    color: 'bg-purple-600',
    category: 'cms',
    inputs: 1,
    outputs: 1,
    description: 'Open data platform'
  },
  wordpress: {
    type: 'wordpress',
    label: 'WordPress',
    icon: 'Globe',
    color: 'bg-blue-700',
    category: 'cms',
    inputs: 1,
    outputs: 1,
    description: 'Website builder and CMS'
  },
  drupal: {
    type: 'drupal',
    label: 'Drupal',
    icon: 'Droplet',
    color: 'bg-blue-600',
    category: 'cms',
    inputs: 1,
    outputs: 1,
    description: 'Enterprise CMS'
  },
  hubspotCMS: {
    type: 'hubspotCMS',
    label: 'HubSpot CMS',
    icon: 'Layout',
    color: 'bg-orange-500',
    category: 'cms',
    inputs: 1,
    outputs: 1,
    description: 'HubSpot content management'
  },

  // Scheduling & Appointments (n8n parity 2025)
  acuity: {
    type: 'acuity',
    label: 'Acuity Scheduling',
    icon: 'Calendar',
    color: 'bg-blue-600',
    category: 'scheduling',
    inputs: 1,
    outputs: 1,
    description: 'Online appointment scheduling'
  },
  doodle: {
    type: 'doodle',
    label: 'Doodle',
    icon: 'CalendarCheck',
    color: 'bg-green-600',
    category: 'scheduling',
    inputs: 1,
    outputs: 1,
    description: 'Meeting scheduling'
  },
  appointlet: {
    type: 'appointlet',
    label: 'Appointlet',
    icon: 'Clock',
    color: 'bg-blue-500',
    category: 'scheduling',
    inputs: 1,
    outputs: 1,
    description: 'Online scheduling'
  },
  savvycal: {
    type: 'savvycal',
    label: 'SavvyCal',
    icon: 'Calendar',
    color: 'bg-indigo-600',
    category: 'scheduling',
    inputs: 1,
    outputs: 1,
    description: 'Scheduling for busy people'
  },
  tidycal: {
    type: 'tidycal',
    label: 'TidyCal',
    icon: 'Calendar',
    color: 'bg-blue-600',
    category: 'scheduling',
    inputs: 1,
    outputs: 1,
    description: 'Simple scheduling'
  }
};
