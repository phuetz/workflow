/**
 * Persistence Hunt Queries - Detection of persistence techniques
 *
 * @module hunt/persistenceQueries
 */

import type { HuntQuery } from './types'

/**
 * Get all persistence-related hunt queries
 */
export function getPersistenceQueries(): HuntQuery[] {
  return [
    createRegistryRunKeysQuery(),
    createScheduledTasksQuery(),
    createWindowsServicesQuery(),
    createStartupItemsQuery(),
    createWMISubscriptionsQuery(),
    createBootkitDetectionQuery(),
    createRootkitIndicatorsQuery(),
    createBrowserExtensionPersistenceQuery(),
    createLogonScriptQuery(),
    createCOMHijackingQuery()
  ]
}

function createRegistryRunKeysQuery(): HuntQuery {
  return {
    id: 'persist_registry_runkeys',
    name: 'Registry Run Keys Modification',
    description:
      'Detects modifications to Windows registry run keys used for persistence',
    category: 'persistence',
    mitreTactics: ['Persistence'],
    mitreTechniques: ['T1547.001', 'T1112'],
    dataSources: ['Windows Registry', 'Process Monitoring'],
    queries: {
      splunk: `index=windows EventCode=4657 TargetObject IN (
        "*\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run*",
        "*\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\RunOnce*"
      ) | stats count by Computer, TargetObject, ObjectValueName`,
      elasticsearch: `{
        "query": {
          "bool": {
            "must": [
              { "match": { "event.code": 4657 } },
              { "wildcard": { "winlog.event_data.TargetObject": "*Run*" } }
            ]
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 4657 and TargetObject contains "Run"`,
      sql: `SELECT Computer, TargetObject, ObjectValueName, COUNT(*)
           FROM SecurityEvents
           WHERE EventCode = 4657 AND TargetObject LIKE '%Run%'
           GROUP BY Computer, TargetObject, ObjectValueName`
    },
    expectedResults:
      'New registry entries in Run/RunOnce keys with suspicious binary paths',
    falsePositiveGuidance:
      'Legitimate software installers and updates may modify run keys. Verify binary path legitimacy.',
    effectiveness: 9,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createScheduledTasksQuery(): HuntQuery {
  return {
    id: 'persist_scheduled_tasks',
    name: 'Suspicious Scheduled Task Creation',
    description:
      'Detects creation of scheduled tasks with suspicious characteristics',
    category: 'persistence',
    mitreTactics: ['Persistence', 'Execution'],
    mitreTechniques: ['T1053.005', 'T1053.006'],
    dataSources: ['Process Monitoring', 'Windows Tasks'],
    queries: {
      splunk: `index=windows OR index=linux EventCode=4698 OR
        (source="/var/log/audit/*" AND task_name!="" AND user != "SYSTEM")
        | regex TaskContent="(powershell|cmd|base64)"
        | stats count by Computer, TaskName, TaskContentEncoded`,
      elasticsearch: `{
        "query": {
          "bool": {
            "must": [
              { "match": { "event.type": "scheduled_task_created" } },
              { "wildcard": { "process.command_line": "*powershell*" } }
            ]
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 4698
      | where TaskContent contains "powershell" or TaskContent contains "cmd"`,
      sql: `SELECT Computer, TaskName, TaskActionPath, TaskActionArguments
           FROM TaskEvents WHERE TaskCreatedAt > NOW() - INTERVAL 1 DAY
           AND (TaskActionPath LIKE '%powershell%' OR TaskActionPath LIKE '%cmd%')`
    },
    expectedResults: 'New scheduled tasks executing suspicious commands',
    falsePositiveGuidance:
      'Check task creator legitimacy. System tasks may legitimately use powershell.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createWindowsServicesQuery(): HuntQuery {
  return {
    id: 'persist_windows_services',
    name: 'Suspicious Windows Service Installation',
    description: 'Detects creation of Windows services with suspicious attributes',
    category: 'persistence',
    mitreTactics: ['Persistence'],
    mitreTechniques: ['T1543.003'],
    dataSources: ['Windows Event Logs', 'Service Registry'],
    queries: {
      splunk: `index=windows EventCode=7045
        | regex ServiceFileName="(powershell|cmd|cscript|wscript|rundll32)"
        | stats count by Computer, ServiceName, ServiceFileName, ServiceStartType`,
      elasticsearch: `{
        "query": {
          "bool": {
            "must": [
              { "match": { "event.code": 7045 } },
              { "wildcard": { "service.path": "*powershell*" } }
            ]
          }
        }
      }`,
      kql: `Event | where EventID == 7045 and ServicePath contains "powershell"`,
      sql: `SELECT Computer, ServiceName, ServicePath, StartType, CreatedAt
           FROM ServiceEvents WHERE EventCode = 7045
           AND (ServicePath LIKE '%powershell%' OR ServicePath LIKE '%rundll32%')`
    },
    expectedResults: 'New services created with suspicious executable paths',
    falsePositiveGuidance:
      'Verify service creator and binary legitimacy through software inventory.',
    effectiveness: 9,
    severity: 'critical',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createStartupItemsQuery(): HuntQuery {
  return {
    id: 'persist_startup_items',
    name: 'Startup Directory Modifications',
    description:
      'Detects suspicious files added to Windows startup directories',
    category: 'persistence',
    mitreTactics: ['Persistence'],
    mitreTechniques: ['T1547.001'],
    dataSources: ['File Monitoring', 'Process Monitoring'],
    queries: {
      splunk: `index=windows EventCode=11 TargetFilename IN (
        "*\\\\AppData\\\\Roaming\\\\Microsoft\\\\Windows\\\\Start Menu\\\\Programs\\\\Startup*",
        "*\\\\ProgramData\\\\Microsoft\\\\Windows\\\\Start Menu\\\\Programs\\\\Startup*"
      ) | stats count by Computer, TargetFilename, User`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "file.path": "*Startup*"
          }
        }
      }`,
      kql: `DeviceFileEvents | where FolderPath contains "Startup"`,
      sql: `SELECT Computer, FileName, FilePath, User, CreatedAt
           FROM FileEvents WHERE FilePath LIKE '%Startup%'
           AND CreatedAt > NOW() - INTERVAL 7 DAY`
    },
    expectedResults: 'Files created in startup directories',
    falsePositiveGuidance: 'Verify file legitimacy. Many legitimate apps use startup.',
    effectiveness: 7,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createWMISubscriptionsQuery(): HuntQuery {
  return {
    id: 'persist_wmi_subscriptions',
    name: 'WMI Event Subscription Persistence',
    description:
      'Detects creation of WMI event subscriptions used for persistence',
    category: 'persistence',
    mitreTactics: ['Persistence'],
    mitreTechniques: ['T1546.003'],
    dataSources: ['WMI Logs', 'Process Monitoring'],
    queries: {
      splunk: `index=windows EventCode=5861
        | regex ObjectName="(Win32_SystemConfigurationChangeEvent|Win32_ProcessStartTrace)"
        | stats count by Computer, ObjectName, EventType`,
      elasticsearch: `{
        "query": {
          "match": {
            "event.code": 5861
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 5861`,
      sql: `SELECT Computer, ObjectName, EventType, CreatedAt
           FROM WMIEvents WHERE EventCode = 5861
           AND CreatedAt > NOW() - INTERVAL 7 DAY`
    },
    expectedResults: 'WMI event subscriptions with suspicious filter or consumer',
    falsePositiveGuidance: 'WMI subscriptions are common in enterprise. Verify legitimacy.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createBootkitDetectionQuery(): HuntQuery {
  return {
    id: 'persist_bootkit_detection',
    name: 'Bootkit and Firmware Indicators',
    description: 'Detects potential bootkit and firmware-level persistence',
    category: 'persistence',
    mitreTactics: ['Persistence'],
    mitreTechniques: ['T1542.001'],
    dataSources: ['System Firmware', 'Boot Logs'],
    queries: {
      splunk: `index=windows source="/var/log/secure" OR EventCode=10016
        | regex message="(UEFI|firmware|bootloader)"
        | stats count by Computer, message`,
      elasticsearch: `{
        "query": {
          "match_phrase": {
            "event.category": "firmware"
          }
        }
      }`,
      kql: `SystemEvents | where EventCategory == "Firmware"`,
      sql: `SELECT Computer, EventDescription, Timestamp
           FROM SystemEvents WHERE EventCategory = 'Firmware'
           AND Timestamp > NOW() - INTERVAL 30 DAY`
    },
    expectedResults:
      'Suspicious firmware modifications or UEFI/BIOS alterations',
    falsePositiveGuidance:
      'Legitimate BIOS updates will have change logs. Verify manufacturer.',
    effectiveness: 6,
    severity: 'critical',
    author: 'Custom',
    lastUpdated: '2024-01-15'
  }
}

function createRootkitIndicatorsQuery(): HuntQuery {
  return {
    id: 'persist_rootkit_indicators',
    name: 'Rootkit Behavioral Indicators',
    description:
      'Detects behavioral signatures of kernel-level rootkits and hidden processes',
    category: 'persistence',
    mitreTactics: ['Persistence', 'Defense Evasion'],
    mitreTechniques: ['T1547.008'],
    dataSources: ['Process Monitoring', 'Kernel Logs'],
    queries: {
      splunk: `index=windows EventCode=10 OR EventCode=11
        | regex CommandLine="(rootkit|hiddenprocess|kernelhook)"
        | stats count by Computer, ProcessName, CommandLine`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "process.command_line": "*rootkit*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "rootkit"`,
      sql: `SELECT ProcessName, CommandLine, ParentProcess, CreatedAt
           FROM ProcessEvents WHERE CommandLine LIKE '%rootkit%'
           OR ProcessName IN ('svchost', 'lsass')
           AND NOT EXISTS (SELECT 1 FROM ApprovedProcesses WHERE Name = ProcessName)`
    },
    expectedResults: 'Suspicious kernel module loads or hidden process access',
    falsePositiveGuidance:
      'Verify process legitimacy. Some antivirus software uses kernel hooks.',
    effectiveness: 7,
    severity: 'critical',
    author: 'Custom',
    lastUpdated: '2024-01-15'
  }
}

function createBrowserExtensionPersistenceQuery(): HuntQuery {
  return {
    id: 'persist_browser_extensions',
    name: 'Suspicious Browser Extension Installation',
    description:
      'Detects installation of potentially malicious browser extensions',
    category: 'persistence',
    mitreTactics: ['Persistence'],
    mitreTechniques: ['T1176'],
    dataSources: ['File Monitoring', 'Browser Logs'],
    queries: {
      splunk: `index=windows EventCode=11
        | regex TargetFilename="(Extensions|extensions.json|manifest.json)"
        | stats count by Computer, User, TargetFilename, ParentImage`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "file.path": "*Extensions*"
          }
        }
      }`,
      kql: `DeviceFileEvents | where FolderPath contains "Extensions"`,
      sql: `SELECT Computer, User, FileName, FilePath, CreatedAt
           FROM FileEvents WHERE FilePath LIKE '%Extensions%'
           AND (FileName LIKE '%.crx' OR FileName LIKE '%.json')`
    },
    expectedResults: 'Unknown browser extensions in user profile',
    falsePositiveGuidance:
      'User-installed extensions are common. Check installation date and source.',
    effectiveness: 6,
    severity: 'medium',
    author: 'Custom',
    lastUpdated: '2024-01-15'
  }
}

function createLogonScriptQuery(): HuntQuery {
  return {
    id: 'persist_logon_scripts',
    name: 'User Logon Script Persistence',
    description:
      'Detects modifications to logon scripts for persistence via Group Policy',
    category: 'persistence',
    mitreTactics: ['Persistence'],
    mitreTechniques: ['T1547.007'],
    dataSources: ['Windows Registry', 'Group Policy Logs'],
    queries: {
      splunk: `index=windows EventCode=4657
        | regex TargetObject="(UserInitMprLogonScript|UserLogonScript)"
        | stats count by Computer, User, ObjectValueName`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "winlog.event_data.TargetObject": "*LogonScript*"
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 4657 and TargetObject contains "LogonScript"`,
      sql: `SELECT Computer, User, TargetObject, NewValue, ModifiedAt
           FROM RegistryEvents WHERE EventCode = 4657
           AND TargetObject LIKE '%LogonScript%'`
    },
    expectedResults: 'New logon scripts pointing to suspicious paths',
    falsePositiveGuidance: 'Check logon script paths against enterprise IT policies.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createCOMHijackingQuery(): HuntQuery {
  return {
    id: 'persist_com_hijacking',
    name: 'COM Registry Hijacking',
    description:
      'Detects modifications to COM object registry entries for persistence',
    category: 'persistence',
    mitreTactics: ['Persistence'],
    mitreTechniques: ['T1546.015'],
    dataSources: ['Windows Registry'],
    queries: {
      splunk: `index=windows EventCode=4657
        | regex TargetObject="\\\\\\\\CLSID\\\\\\\\{*}\\\\\\\\InprocServer32"
        | stats count by Computer, TargetObject, NewValue`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "winlog.event_data.TargetObject": "*CLSID*InprocServer32*"
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 4657 and TargetObject contains "CLSID"`,
      sql: `SELECT Computer, TargetObject, NewValue, ModifiedAt
           FROM RegistryEvents WHERE EventCode = 4657
           AND TargetObject LIKE '%CLSID%InprocServer32%'`
    },
    expectedResults: 'COM object registrations pointing to suspicious DLLs',
    falsePositiveGuidance: 'Verify DLL paths are legitimate. Check software inventory.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}
