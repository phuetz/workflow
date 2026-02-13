import { NodeType } from '../../types/workflow';

export const PRODUCTIVITY_NODES: Record<string, NodeType> = {
  notion: {
      type: 'notion',
      label: 'Notion',
      icon: 'BookOpen',
      color: 'bg-gray-600',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Notion workspace'
    },
  airtable: {
      type: 'airtable',
      label: 'Airtable',
      icon: 'Table',
      color: 'bg-blue-500',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Airtable database'
    },
  trello: {
      type: 'trello',
      label: 'Trello',
      icon: 'Kanban',
      color: 'bg-blue-700',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Trello boards'
    },
  smartsheet: {
      type: 'smartsheet',
      label: 'Smartsheet',
      icon: 'Grid',
      color: 'bg-blue-600',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Smartsheet work management'
    },
  wrike: {
      type: 'wrike',
      label: 'Wrike',
      icon: 'Folder',
      color: 'bg-green-600',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Wrike project management'
    },
  basecamp: {
      type: 'basecamp',
      label: 'Basecamp',
      icon: 'Mountain',
      color: 'bg-red-600',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Basecamp project collaboration'
    },
  microsoftproject: {
      type: 'microsoftproject',
      label: 'Microsoft Project',
      icon: 'Gantt',
      color: 'bg-green-700',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Microsoft Project management'
    },
  docusign: {
      type: 'docusign',
      label: 'DocuSign',
      icon: 'Edit',
      color: 'bg-yellow-500',
      category: 'signature',
      inputs: 1,
      outputs: 1,
      description: 'DocuSign electronic signature'
    },
  hellosign: {
      type: 'hellosign',
      label: 'HelloSign',
      icon: 'PenTool',
      color: 'bg-blue-700',
      category: 'signature',
      inputs: 1,
      outputs: 1,
      description: 'HelloSign/Dropbox Sign'
    },
  pandadoc: {
      type: 'pandadoc',
      label: 'PandaDoc',
      icon: 'FileSignature',
      color: 'bg-purple-500',
      category: 'signature',
      inputs: 1,
      outputs: 1,
      description: 'PandaDoc document automation'
    },
  typeform: {
      type: 'typeform',
      label: 'Typeform',
      icon: 'List',
      color: 'bg-gray-800',
      category: 'forms',
      inputs: 1,
      outputs: 1,
      description: 'Typeform online forms'
    },
  jotform: {
      type: 'jotform',
      label: 'JotForm',
      icon: 'Clipboard',
      color: 'bg-orange-600',
      category: 'forms',
      inputs: 1,
      outputs: 1,
      description: 'JotForm form builder'
    },
  surveymonkey: {
      type: 'surveymonkey',
      label: 'SurveyMonkey',
      icon: 'BarChart',
      color: 'bg-green-500',
      category: 'forms',
      inputs: 1,
      outputs: 1,
      description: 'SurveyMonkey online surveys'
    },
  calendly: {
      type: 'calendly',
      label: 'Calendly',
      icon: 'Calendar',
      color: 'bg-blue-600',
      category: 'scheduling',
      inputs: 1,
      outputs: 1,
      description: 'Calendly meeting scheduling'
    },
  calcom: {
      type: 'calcom',
      label: 'Cal.com',
      icon: 'CalendarCheck',
      color: 'bg-indigo-600',
      category: 'scheduling',
      inputs: 1,
      outputs: 1,
      description: 'Cal.com open source scheduling'
    },
  notionDatabase: {
      type: 'notionDatabase',
      label: 'Notion Database',
      icon: 'Database',
      color: 'bg-gray-700',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Notion (databases, pages)'
    },
  airtableBase: {
      type: 'airtableBase',
      label: 'Airtable Base',
      icon: 'Table',
      color: 'bg-yellow-600',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Airtable (attachments, formulas)'
    },
  mondayBoards: {
      type: 'mondayBoards',
      label: 'Monday.com Boards',
      icon: 'Kanban',
      color: 'bg-red-600',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Monday.com (boards, items)'
    },
  clickupTasks: {
      type: 'clickupTasks',
      label: 'ClickUp Tasks',
      icon: 'CheckSquare',
      color: 'bg-purple-600',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'ClickUp (tasks, lists)'
    },
  basecampProject: {
      type: 'basecampProject',
      label: 'Basecamp',
      icon: 'Mountain',
      color: 'bg-green-700',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Basecamp (projects, todos)'
    },
  wrikeProject: {
      type: 'wrikeProject',
      label: 'Wrike',
      icon: 'Folder',
      color: 'bg-green-600',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Wrike (folders, tasks)'
    },
  smartsheetGrid: {
      type: 'smartsheetGrid',
      label: 'Smartsheet',
      icon: 'Grid',
      color: 'bg-blue-700',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Smartsheet (sheets, rows)'
    },
  codaDocs: {
      type: 'codaDocs',
      label: 'Coda',
      icon: 'FileText',
      color: 'bg-orange-600',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Coda (docs, tables)'
    },
  fiberyApp: {
      type: 'fiberyApp',
      label: 'Fibery',
      icon: 'Network',
      color: 'bg-purple-700',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Fibery (entities, types)'
    },
  heightApp: {
      type: 'heightApp',
      label: 'Height',
      icon: 'ListTodo',
      color: 'bg-gray-800',
      category: 'productivity',
      inputs: 1,
      outputs: 1,
      description: 'Height (tasks, lists)'
    }
};
