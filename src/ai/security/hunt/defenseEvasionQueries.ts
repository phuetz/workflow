/**
 * Defense Evasion Hunt Queries - Detection of defense evasion techniques
 *
 * @module hunt/defenseEvasionQueries
 */

import type { HuntQuery } from './types'

/**
 * Get all defense evasion-related hunt queries
 */
export function getDefenseEvasionQueries(): HuntQuery[] {
  return [
    createProcessInjectionQuery(),
    createDLLSideloadingQuery(),
    createTimestompingQuery(),
    createLogClearingQuery(),
    createSecurityToolDisableQuery(),
    createFileSignatureAlterationQuery(),
    createCodeObfuscationQuery(),
    createFileAccessObfuscationQuery(),
    createSecuritySoftwareDiscoveryQuery(),
    createVirtualizationDetectionQuery()
  ]
}

function createProcessInjectionQuery(): HuntQuery {
  return {
    id: 'evasion_process_injection',
    name: 'Process Injection Detection',
    description:
      'Detects process injection and process hollowing attacks',
    category: 'defense-evasion',
    mitreTactics: ['Defense Evasion'],
    mitreTechniques: ['T1055'],
    dataSources: ['API Monitoring', 'Process Monitoring'],
    queries: {
      splunk: `index=windows EventCode=10
        | regex GrantedAccess="(0x1F3F|0x1F3A|0x1410|0x143B)"
        | stats count by Computer, SourceImage, TargetImage, GrantedAccess`,
      elasticsearch: `{
        "query": {
          "match": {
            "event.action": "process_injection"
          }
        }
      }`,
      kql: `ProcessAccessEvents | where GrantedAccess in ("0x1F3F", "0x1F3A", "0x1410")`,
      sql: `SELECT Computer, SourceProcess, TargetProcess, GrantedAccess, Timestamp
           FROM ProcessAccessEvents WHERE GrantedAccess IN ('0x1F3F', '0x1F3A', '0x1410')`
    },
    expectedResults: 'Process access with memory read/write permissions',
    falsePositiveGuidance:
      'Some legitimate apps perform process injection. Whitelist known processes.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createDLLSideloadingQuery(): HuntQuery {
  return {
    id: 'evasion_dll_sideloading',
    name: 'DLL Sideloading Detection',
    description: 'Detects DLL sideloading and DLL hijacking attempts',
    category: 'defense-evasion',
    mitreTactics: ['Defense Evasion'],
    mitreTechniques: ['T1574.001'],
    dataSources: ['File Monitoring', 'Process Monitoring'],
    queries: {
      splunk: `index=windows EventCode=11 OR EventCode=23
        | regex (TargetFilename=".*\\\\(System32|SysWow64|Windows).*\\\\.dll$" AND SourceFilename="(C:\\\\Users|C:\\\\Temp)")
        | stats count by Computer, SourceFilename, TargetFilename`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "file.name": "*.dll"
          }
        }
      }`,
      kql: `DeviceFileEvents | where FileName endswith ".dll"`,
      sql: `SELECT Computer, SourcePath, TargetPath, Timestamp
           FROM FileEvents WHERE FileName LIKE '%.dll'
           AND SourcePath LIKE 'C:\\Users%' OR SourcePath LIKE 'C:\\Temp%'`
    },
    expectedResults:
      'DLL files copied to or loaded from unusual locations',
    falsePositiveGuidance:
      'Verify DLL source legitimacy. Check against software inventory.',
    effectiveness: 7,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createTimestompingQuery(): HuntQuery {
  return {
    id: 'evasion_timestomping',
    name: 'Timestomping Detection',
    description:
      'Detects file timestamp modification to hide malicious activity',
    category: 'defense-evasion',
    mitreTactics: ['Defense Evasion'],
    mitreTechniques: ['T1070.006'],
    dataSources: ['File Monitoring', 'API Monitoring'],
    queries: {
      splunk: `index=windows EventCode=4697 OR (EventCode=11 AND SourceImage="*\\\\timestomp.exe")
        | stats count by Computer, TargetFilename, SourceImage`,
      elasticsearch: `{
        "query": {
          "match": {
            "event.action": "SetFileTime"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "timestomp"`,
      sql: `SELECT Computer, FileName, FilePath, CreatedTime, ModifiedTime, Timestamp
           FROM FileEvents WHERE SourceProcess = 'timestomp.exe'
           OR (CreatedTime != ModifiedTime AND Timestamp > NOW() - INTERVAL 1 DAY)`
    },
    expectedResults:
      'File timestamp modifications via SetFileTime API or timestomp tool',
    falsePositiveGuidance:
      'Timestomping is suspicious. Investigate immediately unless authorized.',
    effectiveness: 7,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createLogClearingQuery(): HuntQuery {
  return {
    id: 'evasion_log_clearing',
    name: 'Log Clearing and Deletion',
    description: 'Detects attempts to clear or delete audit logs and event logs',
    category: 'defense-evasion',
    mitreTactics: ['Defense Evasion'],
    mitreTechniques: ['T1070.001'],
    dataSources: ['Process Monitoring', 'Event Logs'],
    queries: {
      splunk: `index=windows (EventCode=1102 OR EventCode=4735 OR
        (EventCode=1 AND CommandLine="*wevtutil*clear*"))
        | stats count by Computer, User, CommandLine`,
      elasticsearch: `{
        "query": {
          "match": {
            "event.code": 1102
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 1102 or EventID == 4735`,
      sql: `SELECT Computer, User, CommandLine, Timestamp
           FROM ProcessEvents WHERE EventCode = 1102 OR EventCode = 4735
           OR CommandLine LIKE '%wevtutil%clear%'`
    },
    expectedResults: 'Audit log cleared or Event Log services stopped',
    falsePositiveGuidance:
      'Log clearing is highly suspicious. Investigate immediately.',
    effectiveness: 9,
    severity: 'critical',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createSecurityToolDisableQuery(): HuntQuery {
  return {
    id: 'evasion_disable_security',
    name: 'Security Tool Disablement',
    description:
      'Detects attempts to disable or tamper with security tools',
    category: 'defense-evasion',
    mitreTactics: ['Defense Evasion'],
    mitreTechniques: ['T1089'],
    dataSources: ['Process Monitoring', 'Registry Monitoring'],
    queries: {
      splunk: `index=windows (EventCode=4657 TargetObject="*\\\\Software\\\\Microsoft\\\\Windows Defender*" OR
        EventCode=1 CommandLine="*sc stop*")
        | stats count by Computer, User, TargetObject, CommandLine`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "process.command_line": "*sc stop*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "sc stop"`,
      sql: `SELECT Computer, User, CommandLine, Timestamp
           FROM ProcessEvents WHERE CommandLine LIKE '%sc stop%'
           OR CommandLine LIKE '%Disable-WindowsDefenderAuditLogging%'`
    },
    expectedResults:
      'Windows Defender or antivirus service being stopped/disabled',
    falsePositiveGuidance:
      'Legitimate IT operations may disable security tools. Verify authorization.',
    effectiveness: 8,
    severity: 'critical',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createFileSignatureAlterationQuery(): HuntQuery {
  return {
    id: 'evasion_file_signature',
    name: 'File Signature Alteration',
    description:
      'Detects modification of file signatures and magic bytes',
    category: 'defense-evasion',
    mitreTactics: ['Defense Evasion'],
    mitreTechniques: ['T1027.006'],
    dataSources: ['File Monitoring', 'Hash Analysis'],
    queries: {
      splunk: `index=windows EventCode=11
        | regex TargetFilename="\\\\.(exe|dll|sys)$"
        | join TargetFilename [search index=hash | where first_seen < relative_time="-1h"]
        | stats count by Computer, TargetFilename, hash`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "file.name": "*.exe"
          }
        }
      }`,
      kql: `DeviceFileEvents | where FileName endswith ".exe" or FileName endswith ".dll"`,
      sql: `SELECT f.Computer, f.FilePath, f.FileHash, h.FirstSeen, NOW() as LastModified
           FROM FileEvents f
           LEFT JOIN FileHash h ON f.FileHash = h.Hash
           WHERE f.FileName LIKE '%.exe' OR f.FileName LIKE '%.dll'
           AND DATEDIFF(HOUR, h.FirstSeen, NOW()) > 24`
    },
    expectedResults: 'File signature/hash changes after initial creation',
    falsePositiveGuidance:
      'Updates legitimately change file signatures. Check against update logs.',
    effectiveness: 6,
    severity: 'medium',
    author: 'Custom',
    lastUpdated: '2024-01-15'
  }
}

function createCodeObfuscationQuery(): HuntQuery {
  return {
    id: 'evasion_code_obfuscation',
    name: 'Code Obfuscation Indicators',
    description:
      'Detects indicators of code obfuscation and suspicious script encoding',
    category: 'defense-evasion',
    mitreTactics: ['Defense Evasion'],
    mitreTechniques: ['T1027'],
    dataSources: ['Process Monitoring', 'File Monitoring'],
    queries: {
      splunk: `index=windows
        | regex (CommandLine="([A-Za-z0-9+/]{200,}|[0-9A-F]{200,})" OR
        CommandLine="(EncodeCommandLine|ReflectionAssembly|IAMResourceAccess)")
        | stats count by Computer, User, CommandLine`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "process.command_line": "*base64*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "base64" or CommandLine contains "EncodeCommandLine"`,
      sql: `SELECT Computer, User, CommandLine, Timestamp
           FROM ProcessEvents WHERE CommandLine LIKE '%base64%'
           OR CommandLine LIKE '%EncodeCommandLine%'`
    },
    expectedResults:
      'Heavily obfuscated script or base64-encoded command execution',
    falsePositiveGuidance:
      'Legitimate operations may encode commands. Check context and user.',
    effectiveness: 6,
    severity: 'medium',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createFileAccessObfuscationQuery(): HuntQuery {
  return {
    id: 'evasion_file_access_obfuscation',
    name: 'File Access Obfuscation',
    description:
      'Detects attempts to hide file operations using alternate data streams or NTFS tricks',
    category: 'defense-evasion',
    mitreTactics: ['Defense Evasion'],
    mitreTechniques: ['T1564.004'],
    dataSources: ['File Monitoring', 'Process Monitoring'],
    queries: {
      splunk: `index=windows EventCode=11 OR EventCode=23
        | regex TargetFilename=":.*:"
        | stats count by Computer, TargetFilename, SourceImage`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "file.name": "*:*:*"
          }
        }
      }`,
      kql: `DeviceFileEvents | where FileName contains ":"`,
      sql: `SELECT Computer, FilePath, SourceProcess, Timestamp
           FROM FileEvents WHERE FilePath LIKE '%:%:%'`
    },
    expectedResults:
      'Alternate data stream creation or NTFS hidden file access',
    falsePositiveGuidance:
      'Alternate data streams are rarely legitimate. Investigate immediately.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createSecuritySoftwareDiscoveryQuery(): HuntQuery {
  return {
    id: 'evasion_security_discovery',
    name: 'Security Software Discovery',
    description:
      'Detects scanning and enumeration of security software installations',
    category: 'defense-evasion',
    mitreTactics: ['Defense Evasion'],
    mitreTechniques: ['T1518.001'],
    dataSources: ['Process Monitoring', 'Registry Monitoring'],
    queries: {
      splunk: `index=windows EventCode=4657 TargetObject="*Uninstall*"
        | regex ObjectValueName="(DisplayName|DisplayVersion)"
        | stats count by Computer, ObjectValueName, NewValue`,
      elasticsearch: `{
        "query": {
          "match": {
            "winlog.event_data.TargetObject": "Uninstall"
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 4657 and TargetObject contains "Uninstall"`,
      sql: `SELECT Computer, TargetObject, NewValue, AccessCount
           FROM RegistryEvents WHERE EventCode = 4657
           AND TargetObject LIKE '%Uninstall%'
           GROUP BY Computer, TargetObject, NewValue`
    },
    expectedResults:
      'Frequent registry queries to security software installation directories',
    falsePositiveGuidance:
      'Enumerate uninstall keys may be legitimate. Check user context.',
    effectiveness: 6,
    severity: 'low',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createVirtualizationDetectionQuery(): HuntQuery {
  return {
    id: 'evasion_virtualization_detection',
    name: 'Virtualization Detection Attempts',
    description:
      'Detects attempts to detect analysis environments and reverse engineering',
    category: 'defense-evasion',
    mitreTactics: ['Defense Evasion'],
    mitreTechniques: ['T1518.001'],
    dataSources: ['Process Monitoring', 'Registry Monitoring'],
    queries: {
      splunk: `index=windows
        | regex CommandLine="(VirtualBox|VMware|Hyper-V|VPC|Xen|parallels|bochs)"
        | stats count by Computer, User, CommandLine`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "process.command_line": "*VirtualBox*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "VirtualBox" or CommandLine contains "VMware"`,
      sql: `SELECT Computer, User, CommandLine, Timestamp
           FROM ProcessEvents WHERE CommandLine LIKE '%VirtualBox%'
           OR CommandLine LIKE '%VMware%' OR CommandLine LIKE '%Hyper-V%'`
    },
    expectedResults: 'Virtualization detection tool execution in suspicious context',
    falsePositiveGuidance:
      'Some legitimate tools check virtualization. Verify tool legitimacy.',
    effectiveness: 5,
    severity: 'low',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}
