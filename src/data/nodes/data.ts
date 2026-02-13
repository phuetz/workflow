import { NodeType } from '../../types/workflow';

export const DATA_NODES: Record<string, NodeType> = {
  set: {
      type: 'set',
      label: 'Set',
      icon: 'Edit',
      color: 'bg-blue-600',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Set or modify data fields'
    },
  filter: {
      type: 'filter',
      label: 'Filtrer',
      icon: 'Filter',
      color: 'bg-purple-600',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Filter data'
    },
  sort: {
      type: 'sort',
      label: 'Trier',
      icon: 'ArrowUpDown',
      color: 'bg-indigo-600',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Sort data'
    },
  aggregate: {
      type: 'aggregate',
      label: 'Aggregate',
      icon: 'Sigma',
      color: 'bg-teal-600',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Group and aggregate data'
    },
  limit: {
      type: 'limit',
      label: 'Limit',
      icon: 'Minimize',
      color: 'bg-gray-600',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Limit number of items'
    },
  etl: {
      type: 'etl',
      label: 'ETL Pipeline',
      icon: 'Database',
      color: 'bg-orange-700',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Extract, transform and load data'
    },
  jsonParser: {
      type: 'jsonParser',
      label: 'JSON Parser',
      icon: 'Braces',
      color: 'bg-indigo-500',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Parse and manipulate JSON'
    },
  csvParser: {
      type: 'csvParser',
      label: 'CSV Parser',
      icon: 'FileText',
      color: 'bg-green-500',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Parse CSV files'
    },
  xmlParser: {
      type: 'xmlParser',
      label: 'XML Parser',
      icon: 'Code',
      color: 'bg-blue-500',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Parse XML documents'
    },
  rssreader: { type: 'rssreader', label: 'RSS Reader', icon: 'Rss', color: 'bg-orange-600', category: 'data', inputs: 1, outputs: 1, description: 'RSS feed parser' },
    xmlparserv2: { type: 'xmlparserv2', label: 'XML Parser', icon: 'Code', color: 'bg-green-600', category: 'data', inputs: 1, outputs: 1, description: 'Parse XML data' },
  jsonparserv2: { type: 'jsonparserv2', label: 'JSON Parser', icon: 'Braces', color: 'bg-blue-600', category: 'data', inputs: 1, outputs: 1, description: 'Parse JSON data' },
    csvparserv2: { type: 'csvparserv2', label: 'CSV Parser', icon: 'Table', color: 'bg-teal-600', category: 'data', inputs: 1, outputs: 1, description: 'Parse CSV data' },
  excelreader: { type: 'excelreader', label: 'Excel Reader', icon: 'FileSpreadsheet', color: 'bg-green-600', category: 'data', inputs: 1, outputs: 1, description: 'Read Excel files' },
    excelwriter: { type: 'excelwriter', label: 'Excel Writer', icon: 'FileSpreadsheet', color: 'bg-green-600', category: 'data', inputs: 1, outputs: 1, description: 'Write Excel files' },
  pdfgenerator: { type: 'pdfgenerator', label: 'PDF Generator', icon: 'FileText', color: 'bg-red-600', category: 'data', inputs: 1, outputs: 1, description: 'Generate PDF files' },
    pdfreader: { type: 'pdfreader', label: 'PDF Reader', icon: 'FileText', color: 'bg-red-600', category: 'data', inputs: 1, outputs: 1, description: 'Extract PDF text' },
  imageprocessing: { type: 'imageprocessing', label: 'Image Processing', icon: 'Image', color: 'bg-purple-600', category: 'data', inputs: 1, outputs: 1, description: 'Process images' },
    barcodegenerator: { type: 'barcodegenerator', label: 'Barcode Generator', icon: 'Barcode', color: 'bg-blue-600', category: 'data', inputs: 1, outputs: 1, description: 'Generate barcodes' },
  qrcodegenerator: { type: 'qrcodegenerator', label: 'QR Code Generator', icon: 'QrCode', color: 'bg-indigo-600', category: 'data', inputs: 1, outputs: 1, description: 'Generate QR codes' },
    ocr: { type: 'ocr', label: 'OCR', icon: 'ScanText', color: 'bg-violet-600', category: 'data', inputs: 1, outputs: 1, description: 'Text recognition' },
  openweather: { type: 'openweather', label: 'OpenWeather', icon: 'Cloud', color: 'bg-blue-600', category: 'data', inputs: 1, outputs: 1, description: 'Weather API' },
    weatherapi: { type: 'weatherapi', label: 'WeatherAPI', icon: 'CloudRain', color: 'bg-cyan-600', category: 'data', inputs: 1, outputs: 1, description: 'Weather data' },
  mapbox: { type: 'mapbox', label: 'Mapbox', icon: 'Map', color: 'bg-blue-600', category: 'data', inputs: 1, outputs: 1, description: 'Maps and location' },
  // n8n Core Data Nodes
  itemLists: {
      type: 'itemLists',
      label: 'Item Lists',
      icon: 'ListOrdered',
      color: 'bg-blue-500',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Combine, limit, remove duplicates, sort items'
    },
  html: {
      type: 'html',
      label: 'HTML',
      icon: 'FileCode',
      color: 'bg-orange-500',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Extract or convert HTML content'
    },
  markdown: {
      type: 'markdown',
      label: 'Markdown',
      icon: 'FileText',
      color: 'bg-gray-600',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Convert to/from Markdown format'
    },
  dateTime: {
      type: 'dateTime',
      label: 'Date & Time',
      icon: 'Calendar',
      color: 'bg-indigo-500',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Parse, format, and manipulate dates'
    },
  compression: {
      type: 'compression',
      label: 'Compression',
      icon: 'Archive',
      color: 'bg-yellow-600',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Compress or decompress files (gzip, zip)'
    },
  crypto: {
      type: 'crypto',
      label: 'Crypto',
      icon: 'Lock',
      color: 'bg-purple-700',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Hash, encrypt, decrypt, sign, verify data'
    },
  executeCommand: {
      type: 'executeCommand',
      label: 'Execute Command',
      icon: 'Terminal',
      color: 'bg-gray-800',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Execute shell commands on the server'
    },
  compareDatasets: {
      type: 'compareDatasets',
      label: 'Compare Datasets',
      icon: 'GitCompare',
      color: 'bg-teal-500',
      category: 'data',
      inputs: 2,
      outputs: 4,
      description: 'Compare two data sets and find differences'
    },
  removeDuplicates: {
      type: 'removeDuplicates',
      label: 'Remove Duplicates',
      icon: 'Copy',
      color: 'bg-red-400',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Remove duplicate items based on field'
    },
  renameKeys: {
      type: 'renameKeys',
      label: 'Rename Keys',
      icon: 'Edit2',
      color: 'bg-cyan-500',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Rename object keys/properties'
    },
  splitOut: {
      type: 'splitOut',
      label: 'Split Out',
      icon: 'Maximize2',
      color: 'bg-pink-500',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Create separate items from array field'
    },
  summarize: {
      type: 'summarize',
      label: 'Summarize',
      icon: 'BarChart2',
      color: 'bg-emerald-500',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Calculate statistics and summaries'
    },
  editFields: {
      type: 'editFields',
      label: 'Edit Fields',
      icon: 'PenTool',
      color: 'bg-violet-500',
      category: 'data',
      inputs: 1,
      outputs: 1,
      description: 'Add, edit, remove, or reorder fields'
    },

  // n8n Core Utility Nodes (2024-2025)
  jwt: {
    type: 'jwt',
    label: 'JWT',
    icon: 'Key',
    color: 'bg-amber-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Create, verify, and decode JSON Web Tokens'
  },
  totp: {
    type: 'totp',
    label: 'TOTP',
    icon: 'Clock',
    color: 'bg-green-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Generate and verify Time-based One-Time Passwords'
  },
  ssh: {
    type: 'ssh',
    label: 'SSH',
    icon: 'Terminal',
    color: 'bg-gray-700',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Execute commands on remote servers via SSH'
  },
  ftp: {
    type: 'ftp',
    label: 'FTP',
    icon: 'Upload',
    color: 'bg-blue-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Transfer files via FTP/SFTP protocol'
  },
  git: {
    type: 'git',
    label: 'Git',
    icon: 'GitBranch',
    color: 'bg-orange-600',
    category: 'development',
    inputs: 1,
    outputs: 1,
    description: 'Git operations (clone, pull, push, commit)'
  },
  ldap: {
    type: 'ldap',
    label: 'LDAP',
    icon: 'Users',
    color: 'bg-blue-700',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Query and modify LDAP/Active Directory'
  },
  debugHelper: {
    type: 'debugHelper',
    label: 'Debug Helper',
    icon: 'Bug',
    color: 'bg-yellow-500',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Inspect and debug data during workflow execution'
  },
  dataTable: {
    type: 'dataTable',
    label: 'Data Table',
    icon: 'Table2',
    color: 'bg-indigo-500',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Display and interact with data in table format'
  },
  readWriteFile: {
    type: 'readWriteFile',
    label: 'Read/Write File',
    icon: 'FileEdit',
    color: 'bg-teal-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Read from or write to local files on disk'
  },
  convertToFile: {
    type: 'convertToFile',
    label: 'Convert to File',
    icon: 'FileOutput',
    color: 'bg-purple-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Convert data to downloadable file format'
  },
  extractFromFile: {
    type: 'extractFromFile',
    label: 'Extract from File',
    icon: 'FileInput',
    color: 'bg-emerald-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Extract and parse data from files'
  },
  editImage: {
    type: 'editImage',
    label: 'Edit Image',
    icon: 'ImageIcon',
    color: 'bg-pink-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Resize, crop, rotate, and transform images'
  },
  base64: {
    type: 'base64',
    label: 'Base64',
    icon: 'Binary',
    color: 'bg-gray-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Encode and decode Base64 data'
  },
  executeWorkflow: {
    type: 'executeWorkflow',
    label: 'Execute Workflow',
    icon: 'Play',
    color: 'bg-blue-600',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'Execute another workflow and get results'
  },
  executionData: {
    type: 'executionData',
    label: 'Execution Data',
    icon: 'Activity',
    color: 'bg-cyan-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Access current workflow execution metadata'
  },
  noop: {
    type: 'noop',
    label: 'No-Op',
    icon: 'Circle',
    color: 'bg-gray-400',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'No operation - useful for testing and placeholders'
  },
  arrayOperations: {
    type: 'arrayOperations',
    label: 'Array Operations',
    icon: 'List',
    color: 'bg-indigo-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Advanced array manipulation (chunk, flatten, unique, etc.)'
  },
  dataMapping: {
    type: 'dataMapping',
    label: 'Data Mapping',
    icon: 'Map',
    color: 'bg-violet-600',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Map and transform data between schemas'
  },
  jsonTransform: {
    type: 'jsonTransform',
    label: 'JSON Transform',
    icon: 'Braces',
    color: 'bg-blue-700',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Transform JSON using JSONPath or JMESPath'
  },
  errorGenerator: {
    type: 'errorGenerator',
    label: 'Error Generator',
    icon: 'AlertTriangle',
    color: 'bg-red-600',
    category: 'flow',
    inputs: 1,
    outputs: 0,
    description: 'Generate test errors for workflow testing',
    errorHandle: true
  },

  // ============= ZAPIER PARITY NODES =============

  // Zapier Formatter equivalent - Text, Number, Date, Utilities
  formatter: {
    type: 'formatter',
    label: 'Formatter',
    icon: 'Type',
    color: 'bg-orange-500',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Format and transform data (text, numbers, dates, utilities)'
  },
  textFormatter: {
    type: 'textFormatter',
    label: 'Text Formatter',
    icon: 'CaseSensitive',
    color: 'bg-orange-400',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Text formatting: capitalize, replace, split, trim, encode'
  },
  numberFormatter: {
    type: 'numberFormatter',
    label: 'Number Formatter',
    icon: 'Hash',
    color: 'bg-green-500',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Number formatting: currency, decimals, percentage, math'
  },
  dateFormatter: {
    type: 'dateFormatter',
    label: 'Date Formatter',
    icon: 'Calendar',
    color: 'bg-blue-500',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Date formatting: parse, format, add/subtract, compare'
  },

  // Email Parser - Parse emails and extract data
  emailParser: {
    type: 'emailParser',
    label: 'Email Parser',
    icon: 'Mail',
    color: 'bg-purple-500',
    category: 'data',
    inputs: 1,
    outputs: 1,
    description: 'Parse emails and extract structured data (like Zapier Email Parser)'
  },

  // Lookup - Search data in tables/databases
  lookup: {
    type: 'lookup',
    label: 'Lookup',
    icon: 'Search',
    color: 'bg-teal-500',
    category: 'data',
    inputs: 1,
    outputs: 2,
    description: 'Lookup data from tables, databases or APIs'
  },

  // Digest/Batch - Collect items before processing
  digest: {
    type: 'digest',
    label: 'Digest',
    icon: 'Layers',
    color: 'bg-amber-500',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'Collect and batch items over time (like Zapier Digest)'
  },
  batch: {
    type: 'batch',
    label: 'Batch',
    icon: 'Package',
    color: 'bg-amber-600',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'Batch items by count, time, or schedule'
  },

  // Paths - Multi-branch conditional routing
  paths: {
    type: 'paths',
    label: 'Paths',
    icon: 'GitBranch',
    color: 'bg-pink-500',
    category: 'flow',
    inputs: 1,
    outputs: 5,
    description: 'Multi-branch conditional routing (like Zapier Paths)'
  },

  // Debounce/Throttle - Control execution rate
  debounce: {
    type: 'debounce',
    label: 'Debounce',
    icon: 'Timer',
    color: 'bg-slate-500',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'Wait for quiet period before executing'
  },
  throttle: {
    type: 'throttle',
    label: 'Throttle',
    icon: 'Gauge',
    color: 'bg-slate-600',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'Limit execution rate over time'
  },
  deduplicate: {
    type: 'deduplicate',
    label: 'Deduplicate',
    icon: 'Copy',
    color: 'bg-rose-500',
    category: 'flow',
    inputs: 1,
    outputs: 1,
    description: 'Skip duplicate executions within time window'
  },
  rateLimit: {
    type: 'rateLimit',
    label: 'Rate Limit',
    icon: 'Activity',
    color: 'bg-red-500',
    category: 'flow',
    inputs: 1,
    outputs: 2,
    description: 'Apply rate limiting with token bucket algorithm'
  }
};
