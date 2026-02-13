/**
 * Data Exfiltration Hunt Queries - Detection of data exfiltration techniques
 *
 * @module hunt/exfiltrationQueries
 */

import type { HuntQuery } from './types'

/**
 * Get all data exfiltration-related hunt queries
 */
export function getExfiltrationQueries(): HuntQuery[] {
  return [
    createLargeFileTransferQuery(),
    createDNSTunnelingQuery(),
    createCloudUploadQuery(),
    createEncryptedArchiveCreationQuery(),
    createUnusualProtocolQuery(),
    createDataStagingQuery(),
    createExcessiveNetworkDataQuery(),
    createBitTorrentActivityQuery(),
    createProxyAvoidanceQuery(),
    createAutomatedExfiltrationQuery()
  ]
}

function createLargeFileTransferQuery(): HuntQuery {
  return {
    id: 'exfil_large_files',
    name: 'Large File Transfers',
    description: 'Detects large or unusual file transfers outside the network',
    category: 'data-exfiltration',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1030'],
    dataSources: ['Network Traffic', 'File Monitoring'],
    queries: {
      splunk: `index=network bytes_in > 100000000
        | regex dest_ip!="(10\\.|172\\.16|192\\.168)"
        | stats sum(bytes_in) by src_ip, dest_ip, user
        | where sum_bytes_in > 500000000`,
      elasticsearch: `{
        "query": {
          "bool": {
            "must": [
              { "range": { "network.bytes": { "gt": 100000000 } } }
            ]
          }
        }
      }`,
      kql: `DeviceNetworkEvents | where ReceivedBytes > 100000000`,
      sql: `SELECT src_ip, dest_ip, user, SUM(bytes_transferred) as total
           FROM NetworkFlows WHERE bytes_transferred > 100000000
           GROUP BY src_ip, dest_ip, user
           HAVING SUM(bytes_transferred) > 500000000`
    },
    expectedResults: 'Anomalous data transfers to external destinations',
    falsePositiveGuidance:
      'Check against approved file transfer and backup destinations.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createDNSTunnelingQuery(): HuntQuery {
  return {
    id: 'exfil_dns_tunnel',
    name: 'DNS Tunneling Detection',
    description:
      'Detects data exfiltration via DNS tunneling and unusual DNS queries',
    category: 'data-exfiltration',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1048.003'],
    dataSources: ['DNS Logs', 'Network Traffic'],
    queries: {
      splunk: `index=dns
        | eval query_len=len(query)
        | search query_len > 100
        | stats count by src_ip, query_domain
        | where count > 50`,
      elasticsearch: `{
        "query": {
          "range": {
            "dns.question.name": {
              "gte": 100
            }
          }
        }
      }`,
      kql: `DeviceNetworkEvents | where Protocol == "DNS" | extend QueryLength = strlen(QueryDomain) | where QueryLength > 100`,
      sql: `SELECT src_ip, query_domain, COUNT(*) as query_count
           FROM DNSLogs WHERE LENGTH(query_domain) > 100
           GROUP BY src_ip, query_domain
           HAVING COUNT(*) > 50`
    },
    expectedResults:
      'Unusually long DNS queries or high volume of DNS lookups to same domain',
    falsePositiveGuidance:
      'Verify if legitimate services generate long DNS queries.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createCloudUploadQuery(): HuntQuery {
  return {
    id: 'exfil_cloud_upload',
    name: 'Suspicious Cloud Uploads',
    description: 'Detects unauthorized uploads to cloud storage services',
    category: 'data-exfiltration',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1537'],
    dataSources: ['Network Traffic', 'Proxy Logs', 'Cloud Activity Logs'],
    queries: {
      splunk: `index=web (site="dropbox.com" OR site="drive.google.com" OR site="onedrive.live.com" OR site="aws.amazon.com")
        AND (POST OR PUT)
        | stats count by src_ip, user, uri_host, bytes_in`,
      elasticsearch: `{
        "query": {
          "match": {
            "http.host": "dropbox.com"
          }
        }
      }`,
      kql: `DeviceNetworkEvents | where RemoteUrl contains "dropbox" or RemoteUrl contains "drive.google" or RemoteUrl contains "onedrive"`,
      sql: `SELECT src_ip, user, destination, bytes_uploaded, timestamp
           FROM CloudAccessLogs WHERE destination IN ('dropbox.com', 'drive.google.com')
           AND action = 'upload'`
    },
    expectedResults:
      'Uploads to public cloud services with unusual volume or file types',
    falsePositiveGuidance:
      'Check if user has legitimate reasons to upload to cloud services.',
    effectiveness: 7,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createEncryptedArchiveCreationQuery(): HuntQuery {
  return {
    id: 'exfil_encrypted_archive',
    name: 'Encrypted Archive Creation',
    description:
      'Detects creation of encrypted archives which may indicate data staging',
    category: 'data-exfiltration',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1002'],
    dataSources: ['File Monitoring', 'Process Monitoring'],
    queries: {
      splunk: `index=windows EventCode=11 TargetFilename="(*.zip|*.rar|*.7z|*.tar|*.gz)"
        | regex ParentImage="(powershell|cmd|python|perl)"
        | stats count by Computer, User, TargetFilename, ParentImage`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "file.name": "*.zip"
          }
        }
      }`,
      kql: `DeviceFileEvents | where FileName endswith ".zip" or FileName endswith ".7z"`,
      sql: `SELECT Computer, User, FilePath, FileSize, CreatedAt
           FROM FileEvents WHERE FileName LIKE '%.zip' OR FileName LIKE '%.7z'
           AND CreatedAt > NOW() - INTERVAL 1 DAY`
    },
    expectedResults:
      'Encrypted archives created by unusual processes or in staging locations',
    falsePositiveGuidance:
      'Users regularly create zip files. Check for large collections or suspicious locations.',
    effectiveness: 6,
    severity: 'medium',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createUnusualProtocolQuery(): HuntQuery {
  return {
    id: 'exfil_unusual_protocol',
    name: 'Unusual Protocol Usage',
    description:
      'Detects data exfiltration via non-standard or unusual protocols',
    category: 'data-exfiltration',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1048.001'],
    dataSources: ['Network Traffic', 'Proxy Logs'],
    queries: {
      splunk: `index=network NOT (protocol IN (http, https, dns, ftp, ssh))
        | stats sum(bytes_in) as total_bytes by src_ip, protocol, dest_ip
        | where total_bytes > 10000000`,
      elasticsearch: `{
        "query": {
          "bool": {
            "must_not": {
              "terms": {
                "network.protocol": ["http", "https", "dns"]
              }
            }
          }
        }
      }`,
      kql: `DeviceNetworkEvents | where Protocol notin ("http", "https", "dns", "smb")`,
      sql: `SELECT src_ip, protocol, dest_ip, SUM(bytes_transferred) as total
           FROM NetworkFlows WHERE protocol NOT IN ('http', 'https', 'dns')
           GROUP BY src_ip, protocol, dest_ip
           HAVING SUM(bytes_transferred) > 10000000`
    },
    expectedResults: 'Traffic using uncommon protocols with large data volumes',
    falsePositiveGuidance:
      'Check if business applications legitimately use uncommon protocols.',
    effectiveness: 6,
    severity: 'medium',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createDataStagingQuery(): HuntQuery {
  return {
    id: 'exfil_data_staging',
    name: 'Data Staging Indicators',
    description:
      'Detects indicators of data staging and preparation for exfiltration',
    category: 'data-exfiltration',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1074.001'],
    dataSources: ['File Monitoring', 'Process Monitoring'],
    queries: {
      splunk: `index=windows EventCode=11 TargetFilename="*\\\\AppData\\\\Local\\\\Temp*"
        | stats count as file_count by Computer, User, TargetFilename
        | where file_count > 100`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "file.path": "*Temp*"
          }
        }
      }`,
      kql: `DeviceFileEvents | where FolderPath contains "Temp" | summarize FileCount = count() by DeviceName | where FileCount > 100`,
      sql: `SELECT Computer, User, FilePath, COUNT(*) as file_count
           FROM FileEvents WHERE FilePath LIKE '%Temp%'
           GROUP BY Computer, User, FilePath
           HAVING COUNT(*) > 100`
    },
    expectedResults:
      'Unusual number of files created in temporary directories',
    falsePositiveGuidance:
      'Applications use temp directories. Check for sensitive file staging.',
    effectiveness: 5,
    severity: 'low',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createExcessiveNetworkDataQuery(): HuntQuery {
  return {
    id: 'exfil_excessive_network',
    name: 'Excessive Network Data Transfer',
    description:
      'Detects anomalous increases in network data transfer volumes',
    category: 'data-exfiltration',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1030'],
    dataSources: ['Network Traffic', 'NetFlow Data'],
    queries: {
      splunk: `index=network
        | stats sum(bytes_in) as bytes_today by src_ip
        | join src_ip [search index=network
        | earlier relative_time="-1d@d"
        | stats sum(bytes_in) as bytes_yesterday by src_ip]
        | eval pct_change=((bytes_today-bytes_yesterday)/bytes_yesterday*100)
        | where pct_change > 500`,
      elasticsearch: `{
        "aggs": {
          "anomaly_detection": {
            "auto_date_histogram": {
              "field": "timestamp",
              "buckets": 10
            }
          }
        }
      }`,
      kql: `DeviceNetworkEvents | where Timestamp > ago(1d)`,
      sql: `SELECT src_ip, SUM(bytes_transferred) as total_bytes,
           ROUND(((SUM(bytes_transferred) - LAG(SUM(bytes_transferred)) OVER (ORDER BY DATE(timestamp)))
           / LAG(SUM(bytes_transferred)) OVER (ORDER BY DATE(timestamp))) * 100) as pct_change
           FROM NetworkFlows GROUP BY src_ip, DATE(timestamp)
           HAVING pct_change > 500`
    },
    expectedResults:
      'Significant increase in data transfer volume compared to baseline',
    falsePositiveGuidance:
      'Verify against approved file transfers and backup operations.',
    effectiveness: 7,
    severity: 'medium',
    author: 'Custom',
    lastUpdated: '2024-01-15'
  }
}

function createBitTorrentActivityQuery(): HuntQuery {
  return {
    id: 'exfil_bittorrent',
    name: 'BitTorrent Activity Detection',
    description:
      'Detects BitTorrent traffic which may be used for data exfiltration',
    category: 'data-exfiltration',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1048.001'],
    dataSources: ['Network Traffic', 'Proxy Logs'],
    queries: {
      splunk: `index=network (port=6881 OR port=6889 OR protocol="bittorrent")
        | stats count by src_ip, dest_ip, port`,
      elasticsearch: `{
        "query": {
          "match": {
            "network.protocol": "bittorrent"
          }
        }
      }`,
      kql: `DeviceNetworkEvents | where RemotePort in (6881, 6889) or Protocol == "bittorrent"`,
      sql: `SELECT src_ip, dest_ip, port, COUNT(*) as connection_count
           FROM NetworkFlows WHERE port IN (6881, 6889) OR protocol = 'bittorrent'
           GROUP BY src_ip, dest_ip, port`
    },
    expectedResults: 'BitTorrent traffic to unusual destinations',
    falsePositiveGuidance:
      'BitTorrent usage should be prohibited in enterprise. Investigate any findings.',
    effectiveness: 9,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createProxyAvoidanceQuery(): HuntQuery {
  return {
    id: 'exfil_proxy_avoidance',
    name: 'Proxy Avoidance Indicators',
    description:
      'Detects indicators of proxy bypass for unauthorized communications',
    category: 'data-exfiltration',
    mitreTactics: ['Exfiltration', 'Defense Evasion'],
    mitreTechniques: ['T1557.001'],
    dataSources: ['Network Traffic', 'Firewall Logs'],
    queries: {
      splunk: `index=firewall dst_ip IN (8.8.8.8, 1.1.1.1, 208.67.222.222)
        NOT src_ip IN (proxy_servers)
        | stats count by src_ip, user, dst_ip`,
      elasticsearch: `{
        "query": {
          "match": {
            "destination.ip": "8.8.8.8"
          }
        }
      }`,
      kql: `DeviceNetworkEvents | where RemoteIP in ("8.8.8.8", "1.1.1.1", "208.67.222.222")`,
      sql: `SELECT src_ip, user, dest_ip, COUNT(*) as connection_count
           FROM FirewallLogs WHERE dest_ip IN ('8.8.8.8', '1.1.1.1', '208.67.222.222')
           GROUP BY src_ip, user, dest_ip`
    },
    expectedResults:
      'Connections to public DNS servers directly from endpoints',
    falsePositiveGuidance:
      'Verify if endpoints are allowed to use public DNS resolvers.',
    effectiveness: 7,
    severity: 'medium',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}

function createAutomatedExfiltrationQuery(): HuntQuery {
  return {
    id: 'exfil_automated',
    name: 'Automated Exfiltration Patterns',
    description: 'Detects automated or scheduled data exfiltration patterns',
    category: 'data-exfiltration',
    mitreTactics: ['Exfiltration'],
    mitreTechniques: ['T1537'],
    dataSources: ['Network Traffic', 'Process Monitoring', 'Task Logs'],
    queries: {
      splunk: `index=windows EventCode=4698 TaskName IN ("*exfil*", "*upload*", "*transfer*")
        | stats count by Computer, TaskName, TaskAction`,
      elasticsearch: `{
        "query": {
          "wildcard": {
            "task.name": "*exfil*"
          }
        }
      }`,
      kql: `ProcessCreationEvents | where CommandLine contains "Upload" and CommandLine contains "Schedule"`,
      sql: `SELECT Computer, TaskName, Frequency, CreatedAt
           FROM ScheduledTasks WHERE TaskName LIKE '%exfil%'
           OR TaskName LIKE '%upload%'`
    },
    expectedResults:
      'Scheduled tasks or cron jobs configured for automated data transfers',
    falsePositiveGuidance:
      'Check task legitimacy against business requirements.',
    effectiveness: 8,
    severity: 'high',
    author: 'MITRE ATT&CK',
    lastUpdated: '2024-01-15'
  }
}
