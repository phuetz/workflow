/**
 * Lateral Movement Hunt Queries - Detection of lateral movement techniques
 *
 * @module hunt/lateralMovementQueries
 */

import type { HuntQuery } from './types'

/**
 * Get all lateral movement-related hunt queries
 */
export function getLateralMovementQueries(): HuntQuery[] {
  return [
    createPsExecUsageQuery(),
    createWMIRemoteExecutionQuery(),
    createRemotePowerShellQuery(),
    createRDPConnectionsQuery(),
    createSMBLateralMovementQuery(),
    createWinRMRemotingQuery(),
    createSSHLateralMovementQuery(),
    createRPCRemoteCallQuery(),
    createDCOMRemoteActivationQuery(),
    createMultiplexedConnectionQuery()
  ]
}

function createPsExecUsageQuery(): HuntQuery {
  return {
    id: 'lateral_psexec',
    name: 'PsExec Usage Detection',
    description: 'Detects execution of PsExec and similar remote execution tools',
    category: 'lateral-movement',
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1021.002'],
    dataSources: ['Process Monitoring', 'Network Traffic', 'File Monitoring'],
    queries: {
      splunk: `index=windows EventCode=11 FileName="psexec*" OR
        (EventCode=1 CommandLine="*\\\\\\\\*\\$*" ParentImage="cmd.exe")
        | stats count by Computer, FileName, SourceImage`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "process.command_line": "*psexec*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "psexec"`,
      sql: `SELECT Computer, ProcessName, CommandLine, CreatedAt
           FROM ProcessEvents WHERE ProcessName LIKE '%psexec%'
           OR CommandLine LIKE '%\\\\$'`
    },
    expectedResults: 'PsExec process execution or UNC path access patterns',
    falsePositiveGuidance:
      'PsExec is a legitimate tool. Check if authorized IT operations use it.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createWMIRemoteExecutionQuery(): HuntQuery {
  return {
    id: 'lateral_wmi_remote',
    name: 'WMI Remote Execution',
    description: 'Detects WMI commands used for remote code execution',
    category: 'lateral-movement',
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1047'],
    dataSources: ['Process Monitoring', 'WMI Logs'],
    queries: {
      splunk: `index=windows (EventCode=1 ParentImage="*\\\\wmic.exe" OR
        CommandLine="*wmic*process call create*")
        | stats count by Computer, ParentImage, CommandLine`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "process.command_line": "*wmic*process*call*create*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "wmic" and CommandLine contains "create"`,
      sql: `SELECT Computer, ProcessName, CommandLine, ParentProcess, CreatedAt
           FROM ProcessEvents WHERE ProcessName = 'wmic.exe'
           AND CommandLine LIKE '%process%call%create%'`
    },
    expectedResults:
      'WMI process creation commands targeting remote computers',
    falsePositiveGuidance:
      'Legitimate administration may use WMI. Verify target legitimacy.',
    effectiveness: 9,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createRemotePowerShellQuery(): HuntQuery {
  return {
    id: 'lateral_powershell_remote',
    name: 'Remote PowerShell Execution',
    description:
      'Detects PowerShell remoting and remote command execution',
    category: 'lateral-movement',
    mitreTactics: ['Lateral Movement', 'Execution'],
    mitreTechniques: ['T1021.006'],
    dataSources: ['Process Monitoring', 'PowerShell Logs'],
    queries: {
      splunk: `index=windows (EventCode=1 CommandLine="*-ComputerName*" OR
        EventCode=4688 CommandLine="*Invoke-Command*")
        | stats count by Computer, User, CommandLine`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "process.command_line": "*ComputerName*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "ComputerName"`,
      sql: `SELECT Computer, User, CommandLine, CreatedAt
           FROM ProcessEvents WHERE ProcessName = 'powershell.exe'
           AND (CommandLine LIKE '%ComputerName%' OR CommandLine LIKE '%Invoke-Command%')`
    },
    expectedResults:
      'PowerShell commands with -ComputerName parameter targeting other hosts',
    falsePositiveGuidance:
      'Legitimate IT operations use remote PowerShell. Verify user authorization.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createRDPConnectionsQuery(): HuntQuery {
  return {
    id: 'lateral_rdp',
    name: 'Unusual RDP Connections',
    description:
      'Detects unusual or brute force RDP connection attempts',
    category: 'lateral-movement',
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1021.001'],
    dataSources: ['Security Event Logs', 'Network Traffic'],
    queries: {
      splunk: `index=windows EventCode=4625 AND Reason="Unknown user name or bad password"
        AND TargetUserName!=""
        | stats count as failed_attempts by src_ip, Computer, TargetUserName
        | where failed_attempts > 10`,
      elasticsearch: `{
        "query": {
          "match": {
            "event.code": 4625
          }
        },
        "aggs": {
          "failed_logins": {
            "terms": {
              "field": "source.ip",
              "size": 100
            }
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 4625 and LogonType == 10
      | summarize FailureCount = count() by SourceIP, Account
      | where FailureCount > 10`,
      sql: `SELECT src_ip, Computer, TargetUserName, COUNT(*) as failed_attempts
           FROM SecurityEvents WHERE EventCode = 4625
           AND LogonType = 10
           GROUP BY src_ip, Computer, TargetUserName
           HAVING COUNT(*) > 10`
    },
    expectedResults:
      'Multiple failed RDP login attempts from single source IP',
    falsePositiveGuidance:
      'Check if source IP is known admin console or help desk.',
    effectiveness: 7,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createSMBLateralMovementQuery(): HuntQuery {
  return {
    id: 'lateral_smb',
    name: 'SMB Lateral Movement Indicators',
    description:
      'Detects SMB-based lateral movement and file share exploitation',
    category: 'lateral-movement',
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1021.002'],
    dataSources: ['Network Traffic', 'File Monitoring'],
    queries: {
      splunk: `index=network protocol=smb OR protocol=445
        | stats count as connections by src_ip, dest_ip, user
        | where connections > 50`,
      elasticsearch: `{
        "query": {
          "match": {
            "network.protocol": "smb"
          }
        },
        "aggs": {
          "lateral_movement": {
            "terms": {
              "field": "source.ip"
            }
          }
        }
      }`,
      kql: `DeviceNetworkEvents | where RemotePort == 445 | summarize Connections = count() by RemoteIP | where Connections > 50`,
      sql: `SELECT src_ip, dest_ip, user, COUNT(*) as connections
           FROM NetworkEvents WHERE protocol = 'smb' OR dest_port = 445
           GROUP BY src_ip, dest_ip, user
           HAVING COUNT(*) > 50`
    },
    expectedResults:
      'Unusual number of SMB connections between hosts, especially to file shares',
    falsePositiveGuidance:
      'Legitimate file access may create connections. Check share access patterns.',
    effectiveness: 7,
    severity: 'medium',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createWinRMRemotingQuery(): HuntQuery {
  return {
    id: 'lateral_winrm',
    name: 'WinRM Remote Management',
    description:
      'Detects WinRM (Windows Remote Management) remote execution',
    category: 'lateral-movement',
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1021.006'],
    dataSources: ['Process Monitoring', 'Network Traffic', 'Event Logs'],
    queries: {
      splunk: `index=windows (EventCode=91 OR EventCode=600 OR
        EventCode=1 ParentImage="*\\\\winrshost.exe")
        | stats count by Computer, User, ParentImage`,
      elasticsearch: `{
        "query": {
          "match": {
            "process.parent.name": "winrshost.exe"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where ParentProcessName == "winrshost.exe"`,
      sql: `SELECT Computer, User, ProcessName, ParentProcess, CreatedAt
           FROM ProcessEvents WHERE ParentProcess = 'winrshost.exe'`
    },
    expectedResults: 'Child processes spawned by WinRM host process',
    falsePositiveGuidance:
      'Legitimate IT operations use WinRM. Verify user and target legitimacy.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createSSHLateralMovementQuery(): HuntQuery {
  return {
    id: 'lateral_ssh',
    name: 'SSH Lateral Movement Detection',
    description:
      'Detects SSH-based lateral movement and key-based authentication abuse',
    category: 'lateral-movement',
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1021.004'],
    dataSources: ['SSH Logs', 'Authentication Logs', 'Network Traffic'],
    queries: {
      splunk: `index=linux source="/var/log/auth.log*" sshd
        | regex "Accepted publickey for"
        | stats count by src_ip, user
        | where count > 5`,
      elasticsearch: `{
        "query": {
          "match_phrase": {
            "message": "Accepted publickey"
          }
        },
        "aggs": {
          "by_source": {
            "terms": {
              "field": "source.ip"
            }
          }
        }
      }`,
      kql: `SecurityEvent | where EventID == 540 and LogonType == 3`,
      sql: `SELECT src_ip, user, host, COUNT(*) as connections
           FROM AuthenticationEvents WHERE source = 'ssh'
           AND status = 'success' AND auth_method = 'publickey'
           GROUP BY src_ip, user, host HAVING COUNT(*) > 5`
    },
    expectedResults:
      'Unusual SSH key-based authentication patterns from non-standard sources',
    falsePositiveGuidance: 'Verify SSH source against approved list of admin hosts.',
    effectiveness: 7,
    severity: 'high',
    author: 'Custom',
    lastUpdated: '2024-01-15'
  }
}

function createRPCRemoteCallQuery(): HuntQuery {
  return {
    id: 'lateral_rpc',
    name: 'RPC Remote Calls',
    description: 'Detects suspicious remote procedure calls (RPC)',
    category: 'lateral-movement',
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1021.002'],
    dataSources: ['Network Traffic', 'Event Logs'],
    queries: {
      splunk: `index=windows port=135 OR port=139 OR port=445
        | stats count by src_ip, dest_ip, operation
        | where count > 100`,
      elasticsearch: `{
        "query": {
          "terms": {
            "network.protocol": ["rpc", "dcom"]
          }
        }
      }`,
      kql: `DeviceNetworkEvents | where RemotePort in (135, 139, 445)`,
      sql: `SELECT src_ip, dest_ip, operation, COUNT(*) as call_count
           FROM RPCEvents WHERE port IN (135, 139, 445)
           GROUP BY src_ip, dest_ip, operation
           HAVING COUNT(*) > 100`
    },
    expectedResults: 'Unusual RPC traffic patterns indicating lateral movement',
    falsePositiveGuidance:
      'RPC is legitimate. Check if source is authorized admin host.',
    effectiveness: 6,
    severity: 'medium',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createDCOMRemoteActivationQuery(): HuntQuery {
  return {
    id: 'lateral_dcom',
    name: 'DCOM Remote Activation',
    description:
      'Detects exploitation of DCOM for lateral movement and remote execution',
    category: 'lateral-movement',
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1021.003'],
    dataSources: ['Process Monitoring', 'Network Traffic'],
    queries: {
      splunk: `index=windows EventCode=10 TargetImage="*\\\\svchost.exe"
        | regex GrantedAccess="(0x1F3F|0x143B)"
        | stats count by Computer, SourceImage, TargetImage`,
      elasticsearch: `{
        "query": {
          "match": {
            "process.name": "svchost.exe"
          }
        }
      }`,
      kql: `ProcessAccessEvents | where TargetProcessName == "svchost.exe" and GrantedAccess in ("0x1F3F", "0x143B")`,
      sql: `SELECT Computer, SourceProcess, AccessType, Timestamp
           FROM ProcessAccessEvents WHERE TargetProcess = 'svchost.exe'
           AND AccessType IN ('0x1F3F', '0x143B')`
    },
    expectedResults:
      'Process access to svchost with suspicious granted access rights',
    falsePositiveGuidance:
      'Some legitimate tools access svchost. Verify source legitimacy.',
    effectiveness: 7,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createMultiplexedConnectionQuery(): HuntQuery {
  return {
    id: 'lateral_multiplexed',
    name: 'Multiplexed Network Connections',
    description:
      'Detects suspicious multiplexed or tunneled network connections',
    category: 'lateral-movement',
    mitreTactics: ['Lateral Movement'],
    mitreTechniques: ['T1570'],
    dataSources: ['Network Traffic', 'Firewall Logs'],
    queries: {
      splunk: `index=network dest_ip IN (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
        AND bytes_in > 1000000
        | stats sum(bytes_in) as total_bytes by src_ip, dest_ip
        | where total_bytes > 10000000`,
      elasticsearch: `{
        "query": {
          "bool": {
            "must": [
              { "range": { "network.bytes": { "gt": 1000000 } } }
            ]
          }
        }
      }`,
      kql: `DeviceNetworkEvents | where ReceivedBytes > 1000000 | summarize TotalBytes = sum(ReceivedBytes) by RemoteIP | where TotalBytes > 10000000`,
      sql: `SELECT src_ip, dest_ip, SUM(bytes_transferred) as total_bytes
           FROM NetworkFlows WHERE bytes_transferred > 1000000
           GROUP BY src_ip, dest_ip
           HAVING SUM(bytes_transferred) > 10000000`
    },
    expectedResults:
      'Unusual lateral network traffic with high data transfer volume',
    falsePositiveGuidance:
      'Check if legitimate backup or data synchronization is running.',
    effectiveness: 6,
    severity: 'medium',
    author: 'Custom',
    lastUpdated: '2024-01-15'
  }
}
