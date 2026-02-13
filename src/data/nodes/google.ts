import { NodeType } from '../../types/workflow';

export const GOOGLE_NODES: Record<string, NodeType> = {
  googleSheets: {
      type: 'googleSheets',
      label: 'Google Sheets',
      icon: 'FileSpreadsheet',
      color: 'bg-green-500',
      category: 'google',
      inputs: 1,
      outputs: 1,
      description: 'Google Sheets integration'
    },
  googleDrive: {
      type: 'googleDrive',
      label: 'Google Drive',
      icon: 'HardDrive',
      color: 'bg-blue-500',
      category: 'google',
      inputs: 1,
      outputs: 1,
      description: 'Google Drive file operations'
    },
  googleCalendar: {
      type: 'googleCalendar',
      label: 'Google Calendar',
      icon: 'Calendar',
      color: 'bg-blue-600',
      category: 'google',
      inputs: 1,
      outputs: 1,
      description: 'Google Calendar events'
    },
  googleMaps: {
      type: 'googleMaps',
      label: 'Google Maps',
      icon: 'Map',
      color: 'bg-green-600',
      category: 'google',
      inputs: 1,
      outputs: 1,
      description: 'Google Maps API'
    }
};
