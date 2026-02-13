import { NodeType } from '../../types/workflow';

export const COMMUNICATION_NODES: Record<string, NodeType> = {
  email: {
      type: 'email',
      label: 'Email (SMTP)',
      icon: 'Mail',
      color: 'bg-red-500',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Send emails via SMTP'
    },
  gmail: {
      type: 'gmail',
      label: 'Gmail',
      icon: 'Mail',
      color: 'bg-red-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Gmail integration'
    },
  slack: {
      type: 'slack',
      label: 'Slack',
      icon: 'MessageSquare',
      color: 'bg-purple-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Send Slack messages'
    },
  discord: {
      type: 'discord',
      label: 'Discord',
      icon: 'MessageCircle',
      color: 'bg-indigo-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Discord bot integration'
    },
  telegram: {
      type: 'telegram',
      label: 'Telegram',
      icon: 'Send',
      color: 'bg-blue-400',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Telegram bot'
    },
  teams: {
      type: 'teams',
      label: 'Microsoft Teams',
      icon: 'Users',
      color: 'bg-blue-700',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Microsoft Teams integration'
    },
  twilio: {
      type: 'twilio',
      label: 'Twilio SMS',
      icon: 'Phone',
      color: 'bg-red-700',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Send SMS via Twilio'
    },
  whatsapp: {
      type: 'whatsapp',
      label: 'WhatsApp',
      icon: 'MessageCircle',
      color: 'bg-green-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'WhatsApp Business API'
    },
  zoom: {
      type: 'zoom',
      label: 'Zoom',
      icon: 'Video',
      color: 'bg-blue-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Zoom video conferencing'
    },
  googlemeet: {
      type: 'googlemeet',
      label: 'Google Meet',
      icon: 'VideoConference',
      color: 'bg-green-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Google Meet video calls'
    },
  webex: {
      type: 'webex',
      label: 'Cisco Webex',
      icon: 'Users',
      color: 'bg-blue-700',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Webex video conferencing'
    },
  rocketchat: {
      type: 'rocketchat',
      label: 'Rocket.Chat',
      icon: 'Rocket',
      color: 'bg-red-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Rocket.Chat team messaging'
    },
  mattermost: {
      type: 'mattermost',
      label: 'Mattermost',
      icon: 'MessageSquare',
      color: 'bg-blue-800',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Mattermost team collaboration'
    },
  signal: {
      type: 'signal',
      label: 'Signal',
      icon: 'Shield',
      color: 'bg-blue-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Signal secure messaging'
    },
  rabbitmq: {
      type: 'rabbitmq',
      label: 'RabbitMQ',
      icon: 'MessageSquare',
      color: 'bg-orange-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'RabbitMQ message queue'
    },
  amazonSQS: {
      type: 'amazonSQS',
      label: 'Amazon SQS',
      icon: 'Queue',
      color: 'bg-orange-700',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Amazon Simple Queue Service'
    },
  amazonSNS: {
      type: 'amazonSNS',
      label: 'Amazon SNS',
      icon: 'Bell',
      color: 'bg-orange-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Amazon Simple Notification Service'
    },
  googlePubSub: {
      type: 'googlePubSub',
      label: 'Google Pub/Sub',
      icon: 'Radio',
      color: 'bg-blue-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Google Cloud Pub/Sub messaging'
    },
  azureServiceBus: {
      type: 'azureServiceBus',
      label: 'Azure Service Bus',
      icon: 'Bus',
      color: 'bg-blue-700',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Azure Service Bus enterprise messaging'
    },
  twilioSendGrid: {
      type: 'twilioSendGrid',
      label: 'Twilio SendGrid',
      icon: 'Send',
      color: 'bg-blue-500',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'SendGrid transactional email'
    },
  postmark: {
      type: 'postmark',
      label: 'Postmark',
      icon: 'Mail',
      color: 'bg-yellow-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Postmark transactional email'
    },
  mailgunEmail: {
      type: 'mailgunEmail',
      label: 'Mailgun Email',
      icon: 'Mail',
      color: 'bg-red-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Mailgun email API'
    },
  discordBot: {
      type: 'discordBot',
      label: 'Discord Bot',
      icon: 'Bot',
      color: 'bg-indigo-700',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Discord bot integration'
    },
  mattermostChat: {
      type: 'mattermostChat',
      label: 'Mattermost',
      icon: 'MessageSquare',
      color: 'bg-blue-800',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Mattermost team chat'
    },
  rocketChat: {
      type: 'rocketChat',
      label: 'Rocket.Chat',
      icon: 'Rocket',
      color: 'bg-red-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Rocket.Chat messaging platform'
    },
  signalMessenger: {
      type: 'signalMessenger',
      label: 'Signal Messenger',
      icon: 'Shield',
      color: 'bg-blue-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Signal secure messaging'
    },
  whatsappBusiness: {
      type: 'whatsappBusiness',
      label: 'WhatsApp Business',
      icon: 'MessageCircle',
      color: 'bg-green-600',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'WhatsApp Business API'
    },
  telegramBot: {
      type: 'telegramBot',
      label: 'Telegram Bot',
      icon: 'Send',
      color: 'bg-blue-500',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Telegram Bot API'
    },
  apacheKafka: {
      type: 'apacheKafka',
      label: 'Apache Kafka',
      icon: 'Layers',
      color: 'bg-gray-900',
      category: 'communication',
      inputs: 1,
      outputs: 1,
      description: 'Apache Kafka event streaming'
    }
};
