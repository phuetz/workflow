import { NodeType } from '../../types/workflow';

export const MARKETING_NODES: Record<string, NodeType> = {
  facebook: {
      type: 'facebook',
      label: 'Facebook',
      icon: 'Facebook',
      color: 'bg-blue-700',
      category: 'social',
      inputs: 1,
      outputs: 1,
      description: 'Facebook social platform'
    },
  instagram: {
      type: 'instagram',
      label: 'Instagram',
      icon: 'Camera',
      color: 'bg-pink-500',
      category: 'social',
      inputs: 1,
      outputs: 1,
      description: 'Instagram social platform'
    },
  linkedin: {
      type: 'linkedin',
      label: 'LinkedIn',
      icon: 'Linkedin',
      color: 'bg-blue-800',
      category: 'social',
      inputs: 1,
      outputs: 1,
      description: 'LinkedIn professional network'
    },
  twitter: {
      type: 'twitter',
      label: 'Twitter/X',
      icon: 'Twitter',
      color: 'bg-black',
      category: 'social',
      inputs: 1,
      outputs: 1,
      description: 'Twitter/X social platform'
    },
  youtube: {
      type: 'youtube',
      label: 'YouTube',
      icon: 'Youtube',
      color: 'bg-red-600',
      category: 'social',
      inputs: 1,
      outputs: 1,
      description: 'YouTube video platform'
    },
  mailchimp: {
      type: 'mailchimp',
      label: 'Mailchimp',
      icon: 'Mail',
      color: 'bg-yellow-500',
      category: 'marketing',
      inputs: 1,
      outputs: 1,
      description: 'Mailchimp email marketing'
    },
  sendgrid: {
      type: 'sendgrid',
      label: 'SendGrid',
      icon: 'Send',
      color: 'bg-blue-600',
      category: 'marketing',
      inputs: 1,
      outputs: 1,
      description: 'SendGrid email service'
    },
  convertkit: {
      type: 'convertkit',
      label: 'ConvertKit',
      icon: 'Mail',
      color: 'bg-pink-500',
      category: 'marketing',
      inputs: 1,
      outputs: 1,
      description: 'ConvertKit email marketing'
    },
  marketo: {
      type: 'marketo',
      label: 'Marketo',
      icon: 'Target',
      color: 'bg-purple-700',
      category: 'marketing',
      inputs: 1,
      outputs: 1,
      description: 'Marketo marketing automation'
    },
  activecampaign: {
      type: 'activecampaign',
      label: 'ActiveCampaign',
      icon: 'Zap',
      color: 'bg-blue-600',
      category: 'marketing',
      inputs: 1,
      outputs: 1,
      description: 'ActiveCampaign automation'
    },
  pardot: {
      type: 'pardot',
      label: 'Pardot',
      icon: 'TrendingUp',
      color: 'bg-orange-600',
      category: 'marketing',
      inputs: 1,
      outputs: 1,
      description: 'Pardot B2B marketing'
    },
  constantcontact: {
      type: 'constantcontact',
      label: 'Constant Contact',
      icon: 'Mail',
      color: 'bg-blue-700',
      category: 'marketing',
      inputs: 1,
      outputs: 1,
      description: 'Constant Contact email marketing'
    },
  campaignmonitor: {
      type: 'campaignmonitor',
      label: 'Campaign Monitor',
      icon: 'BarChart',
      color: 'bg-red-600',
      category: 'marketing',
      inputs: 1,
      outputs: 1,
      description: 'Campaign Monitor email'
    },
  klaviyo: {
      type: 'klaviyo',
      label: 'Klaviyo',
      icon: 'ShoppingBag',
      color: 'bg-purple-600',
      category: 'marketing',
      inputs: 1,
      outputs: 1,
      description: 'Klaviyo e-commerce marketing'
    },
  brevo: {
      type: 'brevo',
      label: 'Brevo (Sendinblue)',
      icon: 'Send',
      color: 'bg-blue-600',
      category: 'marketing',
      inputs: 1,
      outputs: 1,
      description: 'Brevo marketing platform'
    },
  semrush: { type: 'semrush', label: 'Semrush', icon: 'TrendingUp', color: 'bg-blue-600', category: 'marketing', inputs: 1, outputs: 1, description: 'SEO analytics' },
    ahrefs: { type: 'ahrefs', label: 'Ahrefs', icon: 'TrendingUp', color: 'bg-orange-600', category: 'marketing', inputs: 1, outputs: 1, description: 'SEO toolset' },
  moz: { type: 'moz', label: 'Moz', icon: 'TrendingUp', color: 'bg-indigo-600', category: 'marketing', inputs: 1, outputs: 1, description: 'SEO software' },
    googlesearchconsole: { type: 'googlesearchconsole', label: 'Google Search Console', icon: 'Search', color: 'bg-blue-600', category: 'marketing', inputs: 1, outputs: 1, description: 'Search performance' },
  googletagmanager: { type: 'googletagmanager', label: 'Google Tag Manager', icon: 'Tag', color: 'bg-green-600', category: 'marketing', inputs: 1, outputs: 1, description: 'Tag management' },
    linkedinads: { type: 'linkedinads', label: 'LinkedIn Ads', icon: 'Linkedin', color: 'bg-blue-700', category: 'marketing', inputs: 1, outputs: 1, description: 'LinkedIn advertising' },
  twitterads: { type: 'twitterads', label: 'Twitter Ads', icon: 'Twitter', color: 'bg-sky-500', category: 'marketing', inputs: 1, outputs: 1, description: 'Twitter advertising' },
    tiktokads: { type: 'tiktokads', label: 'TikTok Ads', icon: 'Video', color: 'bg-pink-600', category: 'marketing', inputs: 1, outputs: 1, description: 'TikTok advertising' },
  pinterestads: { type: 'pinterestads', label: 'Pinterest Ads', icon: 'Image', color: 'bg-red-600', category: 'marketing', inputs: 1, outputs: 1, description: 'Pinterest advertising' },
    bingwebmaster: { type: 'bingwebmaster', label: 'Bing Webmaster', icon: 'Search', color: 'bg-teal-600', category: 'marketing', inputs: 1, outputs: 1, description: 'Bing SEO tools' },
  getresponse: { type: 'getresponse', label: 'GetResponse', icon: 'Mail', color: 'bg-blue-700', category: 'marketing', inputs: 1, outputs: 1, description: 'Email marketing' },
  vimeo: { type: 'vimeo', label: 'Vimeo', icon: 'Video', color: 'bg-blue-600', category: 'media', inputs: 1, outputs: 1, description: 'Video hosting' },
    twitch: { type: 'twitch', label: 'Twitch', icon: 'Twitch', color: 'bg-purple-600', category: 'media', inputs: 1, outputs: 1, description: 'Live streaming' },
  streamyard: { type: 'streamyard', label: 'StreamYard', icon: 'Radio', color: 'bg-green-600', category: 'media', inputs: 1, outputs: 1, description: 'Live streaming studio' },
    cloudinary: { type: 'cloudinary', label: 'Cloudinary', icon: 'Cloud', color: 'bg-blue-600', category: 'media', inputs: 1, outputs: 1, description: 'Media management' },
  imgix: { type: 'imgix', label: 'Imgix', icon: 'Image', color: 'bg-orange-600', category: 'media', inputs: 1, outputs: 1, description: 'Image processing' },
    imagekit: { type: 'imagekit', label: 'ImageKit', icon: 'Image', color: 'bg-purple-600', category: 'media', inputs: 1, outputs: 1, description: 'Image CDN' },
  mux: { type: 'mux', label: 'Mux', icon: 'Film', color: 'bg-pink-600', category: 'media', inputs: 1, outputs: 1, description: 'Video infrastructure' },
    wistia: { type: 'wistia', label: 'Wistia', icon: 'Video', color: 'bg-blue-600', category: 'media', inputs: 1, outputs: 1, description: 'Video marketing' },
  vidyard: { type: 'vidyard', label: 'Vidyard', icon: 'Video', color: 'bg-green-600', category: 'media', inputs: 1, outputs: 1, description: 'Video platform' },

  // Social Media Management (n8n parity 2025)
  hootsuite: {
    type: 'hootsuite',
    label: 'Hootsuite',
    icon: 'Share2',
    color: 'bg-gray-800',
    category: 'social',
    inputs: 1,
    outputs: 1,
    description: 'Social media management platform'
  },
  sproutSocial: {
    type: 'sproutSocial',
    label: 'Sprout Social',
    icon: 'Leaf',
    color: 'bg-green-600',
    category: 'social',
    inputs: 1,
    outputs: 1,
    description: 'Social media management and analytics'
  },
  buffer: {
    type: 'buffer',
    label: 'Buffer',
    icon: 'Layers',
    color: 'bg-blue-500',
    category: 'social',
    inputs: 1,
    outputs: 1,
    description: 'Social media scheduling'
  },
  later: {
    type: 'later',
    label: 'Later',
    icon: 'Clock',
    color: 'bg-pink-600',
    category: 'social',
    inputs: 1,
    outputs: 1,
    description: 'Visual social media planner'
  },
  socialBee: {
    type: 'socialBee',
    label: 'SocialBee',
    icon: 'Hexagon',
    color: 'bg-yellow-500',
    category: 'social',
    inputs: 1,
    outputs: 1,
    description: 'Social media management tool'
  },

  // Sales Engagement (n8n parity 2025)
  lemlist: {
    type: 'lemlist',
    label: 'Lemlist',
    icon: 'Mail',
    color: 'bg-purple-600',
    category: 'marketing',
    inputs: 1,
    outputs: 1,
    description: 'Cold email outreach automation'
  },
  apollo: {
    type: 'apollo',
    label: 'Apollo.io',
    icon: 'Target',
    color: 'bg-blue-700',
    category: 'marketing',
    inputs: 1,
    outputs: 1,
    description: 'Sales intelligence and engagement'
  },
  outreach: {
    type: 'outreach',
    label: 'Outreach',
    icon: 'PhoneOutgoing',
    color: 'bg-purple-700',
    category: 'marketing',
    inputs: 1,
    outputs: 1,
    description: 'Sales engagement platform'
  },
  salesloft: {
    type: 'salesloft',
    label: 'Salesloft',
    icon: 'Mic',
    color: 'bg-green-700',
    category: 'marketing',
    inputs: 1,
    outputs: 1,
    description: 'Sales engagement platform'
  },
  instantly: {
    type: 'instantly',
    label: 'Instantly',
    icon: 'Zap',
    color: 'bg-blue-600',
    category: 'marketing',
    inputs: 1,
    outputs: 1,
    description: 'Cold email automation'
  },
  reply: {
    type: 'reply',
    label: 'Reply.io',
    icon: 'MessageCircle',
    color: 'bg-indigo-600',
    category: 'marketing',
    inputs: 1,
    outputs: 1,
    description: 'Sales automation platform'
  },

  // Media & Entertainment (n8n parity 2025)
  spotify: {
    type: 'spotify',
    label: 'Spotify',
    icon: 'Music',
    color: 'bg-green-500',
    category: 'media',
    inputs: 1,
    outputs: 1,
    description: 'Music streaming service'
  },
  soundcloud: {
    type: 'soundcloud',
    label: 'SoundCloud',
    icon: 'Cloud',
    color: 'bg-orange-500',
    category: 'media',
    inputs: 1,
    outputs: 1,
    description: 'Audio distribution platform'
  },
  deezer: {
    type: 'deezer',
    label: 'Deezer',
    icon: 'Music2',
    color: 'bg-black',
    category: 'media',
    inputs: 1,
    outputs: 1,
    description: 'Music streaming service'
  },

  // Design Tools (n8n parity 2025)
  figma: {
    type: 'figma',
    label: 'Figma',
    icon: 'Figma',
    color: 'bg-purple-500',
    category: 'design',
    inputs: 1,
    outputs: 1,
    description: 'Collaborative design tool'
  },
  canva: {
    type: 'canva',
    label: 'Canva',
    icon: 'Palette',
    color: 'bg-cyan-500',
    category: 'design',
    inputs: 1,
    outputs: 1,
    description: 'Graphic design platform'
  },
  sketch: {
    type: 'sketch',
    label: 'Sketch',
    icon: 'PenTool',
    color: 'bg-orange-600',
    category: 'design',
    inputs: 1,
    outputs: 1,
    description: 'Digital design toolkit'
  },
  invision: {
    type: 'invision',
    label: 'InVision',
    icon: 'Layout',
    color: 'bg-pink-600',
    category: 'design',
    inputs: 1,
    outputs: 1,
    description: 'Digital product design platform'
  },
  zeplin: {
    type: 'zeplin',
    label: 'Zeplin',
    icon: 'Layers',
    color: 'bg-yellow-500',
    category: 'design',
    inputs: 1,
    outputs: 1,
    description: 'Design handoff platform'
  },
  adobe: {
    type: 'adobe',
    label: 'Adobe Creative Cloud',
    icon: 'Triangle',
    color: 'bg-red-600',
    category: 'design',
    inputs: 1,
    outputs: 1,
    description: 'Adobe creative suite'
  }
};
