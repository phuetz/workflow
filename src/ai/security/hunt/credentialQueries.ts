/**
 * Credential Access Hunt Queries - Detection of credential theft techniques
 *
 * @module hunt/credentialQueries
 */

import type { HuntQuery } from './types'

/**
 * Get all credential access-related hunt queries
 */
export function getCredentialQueries(): HuntQuery[] {
  return [
    createLSASSAccessQuery(),
    createCredentialDumpingQuery(),
    createKerberosticketDumpingQuery(),
    createPassTheHashQuery(),
    createMimikatzSignaturesQuery(),
    createSAMDumpQuery(),
    createNTDSExtractQuery(),
    createBrowserCredentialAccessQuery(),
    createInputCaptureQuery(),
    createPasswordFiltersQuery()
  ]
}

function createLSASSAccessQuery(): HuntQuery {
  return {
    id: 'cred_lsass_access',
    name: 'LSASS Memory Access',
    description: 'Detects suspicious access to LSASS process memory',
    category: 'credential-access',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1110.001', 'T1555.001'],
    dataSources: ['Process Monitoring', 'API Monitoring'],
    queries: {
      splunk: `index=windows EventCode=10 TargetImage="*\\\\lsass.exe"
        | regex GrantedAccess="(0x1F3F|0x143B|0x1410)"
        | stats count by Computer, SourceImage, TargetImage, GrantedAccess`,
      elasticsearch: `{
        "query": {
          "bool": {
            "must": [
              { "match": { "target.process.name": "lsass.exe" } },
              { "match": { "event.action": "OpenProcess" } }
            ]
          }
        }
      }`,
      kql: `ProcessAccessEvents | where TargetProcess == "lsass.exe"
      and GrantedAccess in ("0x1F3F", "0x143B")`,
      sql: `SELECT Computer, SourceProcess, GrantedAccess, Timestamp
           FROM ProcessAccessEvents WHERE TargetProcess = 'lsass.exe'
           AND GrantedAccess IN ('0x1F3F', '0x143B')`
    },
    expectedResults:
      'Unusual processes opening LSASS with sensitive access rights',
    falsePositiveGuidance:
      'Some AV software accesses LSASS. Whitelist known security tools.',
    effectiveness: 9,
    severity: 'critical',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createCredentialDumpingQuery(): HuntQuery {
  return {
    id: 'cred_dumping',
    name: 'Credential Dumping Indicators',
    description: 'Detects indicators of credential dumping attacks',
    category: 'credential-access',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1110.004', 'T1040'],
    dataSources: ['Process Monitoring', 'File Monitoring'],
    queries: {
      splunk: `index=windows (EventCode=10 OR EventCode=11)
        | regex (SourceImage="(procdump|TaskManager|Autoruns)"
        OR TargetFilename="(*.dmp|*lsass*)" OR CommandLine="(dumpit|memdump)")
        | stats count by Computer, SourceImage, TargetFilename`,
      elasticsearch: `{
        "query": {
          "bool": {
            "should": [
              { "wildcard": { "process.name": "*procdump*" } },
              { "wildcard": { "file.name": "*.dmp" } }
            ]
          }
        }
      }`,
      kql: `union (ProcessCreationEvents | where CommandLine contains "procdump"),
      (DeviceFileEvents | where FileName endswith ".dmp")`,
      sql: `SELECT Computer, ProcessName, CommandLine, FileName, Timestamp
           FROM (SELECT * FROM ProcessEvents WHERE ProcessName = 'procdump.exe'
           UNION ALL SELECT * FROM FileEvents WHERE FileName LIKE '%.dmp'
           AND CreatedAt > NOW() - INTERVAL 1 DAY)`
    },
    expectedResults: 'Process dump files or credential dumping tool execution',
    falsePositiveGuidance:
      'Check process legitimacy. Some IT tools may create legitimate dumps.',
    effectiveness: 8,
    severity: 'critical',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createKerberosticketDumpingQuery(): HuntQuery {
  return {
    id: 'cred_kerberos_ticket',
    name: 'Kerberos Ticket Dumping',
    description: 'Detects Kerberos ticket extraction attempts',
    category: 'credential-access',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1558.001'],
    dataSources: ['Process Monitoring', 'API Monitoring'],
    queries: {
      splunk: `index=windows EventCode=4649 OR (EventCode=10 AND TargetImage="*\\\\lsass.exe")
        | regex CommandLine="(klist|Rubeus|kerberoast)"
        | stats count by Computer, ProcessName, CommandLine, User`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "process.command_line": "*klist*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "klist"`,
      sql: `SELECT Computer, ProcessName, CommandLine, User, CreatedAt
           FROM ProcessEvents WHERE CommandLine LIKE '%klist%'
           OR CommandLine LIKE '%Rubeus%' OR CommandLine LIKE '%kerberoast%'`
    },
    expectedResults: 'Kerberos ticket extraction tools or unusual ticket requests',
    falsePositiveGuidance: 'klist is a legitimate utility. Check user legitimacy.',
    effectiveness: 7,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createPassTheHashQuery(): HuntQuery {
  return {
    id: 'cred_pass_the_hash',
    name: 'Pass-the-Hash Attack Detection',
    description:
      'Detects Pass-the-Hash attacks via unusual authentication patterns',
    category: 'credential-access',
    mitreTactics: ['Credential Access', 'Lateral Movement'],
    mitreTechniques: ['T1550.002'],
    dataSources: ['Authentication Logs', 'Network Traffic'],
    queries: {
      splunk: `index=windows EventCode=4625 Status="0xc000006e"
        | stats count by Computer, User, src_ip
        | where count > 5`,
      elasticsearch: `{
        "query": {
          "bool": {
            "must": [
              { "match": { "event.code": 4625 } },
              { "match": { "status": "0xc000006e" } }
            ]
          }
        },
        "aggs": {
          "failed_logins": {
            "terms": {
              "field": "source.ip"
            }
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 4625 and Status == "0xc000006e"
      | summarize count() by SourceIP, Account`,
      sql: `SELECT SourceIP, User, COUNT(*) as FailureCount
           FROM AuthenticationEvents WHERE EventCode = 4625
           AND Status = '0xc000006e'
           GROUP BY SourceIP, User HAVING COUNT(*) > 5`
    },
    expectedResults:
      'Multiple failed login attempts with LOGON_FAILURE_UNKNOWN_USER status',
    falsePositiveGuidance:
      'Check if brute force is legitimate. Some tools may trigger false positives.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createMimikatzSignaturesQuery(): HuntQuery {
  return {
    id: 'cred_mimikatz',
    name: 'Mimikatz Execution Detection',
    description: 'Detects Mimikatz and similar credential dumping tools',
    category: 'credential-access',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1110.001', 'T1555.003'],
    dataSources: ['Process Monitoring', 'File Monitoring'],
    queries: {
      splunk: `index=windows
        | regex (FileName="(mimikatz|mimidrv|mimilsa)" OR
        CommandLine="(privilege::debug|sekurlsa::logonpasswords|token::elevate)")
        | stats count by Computer, User, FileName`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "process.name": "*mimikatz*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where ProcessName contains "mimikatz"`,
      sql: `SELECT Computer, ProcessName, CommandLine, User, CreatedAt
           FROM ProcessEvents WHERE ProcessName LIKE '%mimikatz%'
           OR CommandLine LIKE '%privilege::debug%'`
    },
    expectedResults: 'Mimikatz process execution or command-line signatures',
    falsePositiveGuidance:
      'Mimikatz is rarely legitimate. Verify with security team immediately.',
    effectiveness: 9,
    severity: 'critical',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createSAMDumpQuery(): HuntQuery {
  return {
    id: 'cred_sam_dump',
    name: 'SAM Database Dump Detection',
    description: 'Detects attempts to dump the Windows SAM database',
    category: 'credential-access',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1003.002'],
    dataSources: ['File Monitoring', 'Registry Monitoring'],
    queries: {
      splunk: `index=windows (EventCode=11 TargetFilename="*\\\\SAM" OR
        EventCode=4657 TargetObject="*\\\\Sam")
        | stats count by Computer, TargetFilename, SourceImage`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "file.name": "*SAM*"
          }
        }
      }`,
      kql: `DeviceFileEvents | where FileName contains "SAM"`,
      sql: `SELECT Computer, TargetFilename, SourceProcess, Timestamp
           FROM FileEvents WHERE TargetFilename LIKE '%SAM%'
           OR TargetFilename LIKE '%SECURITY%'`
    },
    expectedResults: 'File copies of SAM registry hive',
    falsePositiveGuidance: 'SAM access is highly suspicious. Investigate immediately.',
    effectiveness: 9,
    severity: 'critical',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createNTDSExtractQuery(): HuntQuery {
  return {
    id: 'cred_ntds_extract',
    name: 'NTDS.dit Extraction Detection',
    description: 'Detects attempts to extract the Active Directory NTDS database',
    category: 'credential-access',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1003.003'],
    dataSources: ['File Monitoring', 'VSS Monitoring'],
    queries: {
      splunk: `index=windows (EventCode=11 TargetFilename="*ntds.dit" OR
        CommandLine="(ntdsutil|vssadmin|diskshadow)")
        | stats count by Computer, TargetFilename, CommandLine`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "file.name": "*ntds.dit*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "ntdsutil"`,
      sql: `SELECT Computer, FileName, FilePath, ProcessName, CreatedAt
           FROM FileEvents WHERE FilePath LIKE '%ntds.dit%'
           OR ProcessName IN ('ntdsutil.exe', 'vssadmin.exe')`
    },
    expectedResults: 'NTDS.dit copies or Volume Shadow Copy enumeration',
    falsePositiveGuidance: 'NTDS extraction is highly suspicious. Investigate immediately.',
    effectiveness: 9,
    severity: 'critical',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createBrowserCredentialAccessQuery(): HuntQuery {
  return {
    id: 'cred_browser_access',
    name: 'Browser Credential Access',
    description: 'Detects access to browser credential stores',
    category: 'credential-access',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1555.003'],
    dataSources: ['File Monitoring', 'Process Monitoring'],
    queries: {
      splunk: `index=windows EventCode=10 OR EventCode=11
        | regex (TargetFilename="(Login Data|Cookies|Passwords)" OR
        SourceImage="(ChromeDriver|WebDriver)")
        | stats count by Computer, User, TargetFilename`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "file.path": "*AppData*Local*Chrome*"
          }
        }
      }`,
      kql: `DeviceFileEvents | where FolderPath contains "Local" and FolderPath contains "Chrome"`,
      sql: `SELECT Computer, User, FilePath, ProcessName, Timestamp
           FROM FileEvents WHERE FilePath LIKE '%Chrome%'
           AND FileName IN ('Login Data', 'Cookies', 'Passwords')`
    },
    expectedResults:
      'Unusual access to browser credential databases or password stores',
    falsePositiveGuidance:
      'Browser credential tools are suspicious. Verify with user immediately.',
    effectiveness: 7,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createInputCaptureQuery(): HuntQuery {
  return {
    id: 'cred_input_capture',
    name: 'Input Capture/Keylogger Detection',
    description:
      'Detects potential keyloggers or input capture mechanisms',
    category: 'credential-access',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1056.001'],
    dataSources: ['Process Monitoring', 'API Monitoring'],
    queries: {
      splunk: `index=windows EventCode=10
        | regex (SourceImage="(keylogger|spyware|ispy)" OR
        API="(SetWindowsHookEx|GetAsyncKeyState|GetKeyState)")
        | stats count by Computer, SourceImage, API`,
      elasticsearch: `{
        "query": {
          "match": {
            "event.category": "input_capture"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where ProcessName contains "keylogger"`,
      sql: `SELECT Computer, ProcessName, APICall, User, Timestamp
           FROM APICallEvents WHERE APICall IN ('SetWindowsHookEx', 'GetAsyncKeyState')`
    },
    expectedResults: 'Suspicious API calls or keylogger-like tool execution',
    falsePositiveGuidance:
      'Some accessibility software may use these APIs legitimately.',
    effectiveness: 6,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createPasswordFiltersQuery(): HuntQuery {
  return {
    id: 'cred_password_filter',
    name: 'Password Filter Installation',
    description:
      'Detects installation of malicious password filters for credential capture',
    category: 'credential-access',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1556.001'],
    dataSources: ['Windows Registry', 'File Monitoring'],
    queries: {
      splunk: `index=windows EventCode=4657
        | regex TargetObject=".*Notification Packages"
        | stats count by Computer, NewValue, TargetObject`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "winlog.event_data.TargetObject": "*Notification Packages*"
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 4657 and TargetObject contains "Notification"`,
      sql: `SELECT Computer, TargetObject, NewValue, ModifiedAt
           FROM RegistryEvents WHERE EventCode = 4657
           AND TargetObject LIKE '%Notification Packages%'`
    },
    expectedResults: 'Registry modifications adding password filter DLLs',
    falsePositiveGuidance: 'Verify DLL against approved password filter list.',
    effectiveness: 8,
    severity: 'critical',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}
