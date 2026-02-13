import { NodeType } from '../../types/workflow';

export const MICROSOFT_NODES: Record<string, NodeType> = {
  excel365: {
      type: 'excel365',
      label: 'Microsoft Excel 365',
      icon: 'FileSpreadsheet',
      color: 'bg-green-700',
      category: 'microsoft',
      inputs: 1,
      outputs: 1,
      description: 'Excel 365 spreadsheet operations'
    },
  sharepoint: {
      type: 'sharepoint',
      label: 'Microsoft SharePoint',
      icon: 'Folders',
      color: 'bg-blue-800',
      category: 'microsoft',
      inputs: 1,
      outputs: 1,
      description: 'SharePoint document management'
    },
  powerbi: {
      type: 'powerbi',
      label: 'Microsoft Power BI',
      icon: 'BarChart3',
      color: 'bg-yellow-600',
      category: 'microsoft',
      inputs: 1,
      outputs: 1,
      description: 'Power BI analytics and reporting'
    },
  dynamics365: {
      type: 'dynamics365',
      label: 'Microsoft Dynamics 365',
      icon: 'Building2',
      color: 'bg-blue-700',
      category: 'microsoft',
      inputs: 1,
      outputs: 1,
      description: 'Dynamics 365 CRM/ERP'
    },
  powerAutomate: {
      type: 'powerAutomate',
      label: 'Microsoft Power Automate',
      icon: 'Workflow',
      color: 'bg-purple-700',
      category: 'microsoft',
      inputs: 1,
      outputs: 1,
      description: 'Power Automate workflow integration'
    },
  outlook: {
      type: 'outlook',
      label: 'Microsoft Outlook',
      icon: 'Mail',
      color: 'bg-blue-600',
      category: 'microsoft',
      inputs: 1,
      outputs: 1,
      description: 'Outlook email and calendar'
    },
  planner: {
      type: 'planner',
      label: 'Microsoft Planner',
      icon: 'ListChecks',
      color: 'bg-purple-600',
      category: 'microsoft',
      inputs: 1,
      outputs: 1,
      description: 'Microsoft Planner project management'
    },
  word365: {
      type: 'word365',
      label: 'Microsoft Word 365',
      icon: 'FileText',
      color: 'bg-blue-700',
      category: 'microsoft',
      inputs: 1,
      outputs: 1,
      description: 'Word 365 document automation'
    },
  azureAI: {
      type: 'azureAI',
      label: 'Azure OpenAI',
      icon: 'Brain',
      color: 'bg-blue-800',
      category: 'microsoft',
      inputs: 1,
      outputs: 1,
      description: 'Azure OpenAI services'
    },
  azureDevOps: {
      type: 'azureDevOps',
      label: 'Azure DevOps',
      icon: 'GitMerge',
      color: 'bg-blue-900',
      category: 'microsoft',
      inputs: 1,
      outputs: 1,
      description: 'Azure DevOps integration'
    }
};
