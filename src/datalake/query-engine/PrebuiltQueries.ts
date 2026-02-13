/**
 * PrebuiltQueries - Pre-configured security analytics queries
 */

import type { SecurityQuery, QueryCategory } from './types';

export type PrebuiltQueryDefinition = Omit<
  SecurityQuery,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'
>;

export const PREBUILT_QUERIES: PrebuiltQueryDefinition[] = [
  // Threat Hunting Queries
  {
    name: 'Lateral Movement Detection',
    description:
      'Detect potential lateral movement by analyzing authentication patterns across hosts',
    sql: `
      SELECT
        source_ip,
        destination_ip,
        user_id,
        COUNT(DISTINCT destination_host) as hosts_accessed,
        MIN(timestamp) as first_access,
        MAX(timestamp) as last_access,
        ARRAY_AGG(DISTINCT auth_method) as auth_methods
      FROM security_events
      WHERE event_type = 'authentication'
        AND timestamp >= :start_time
        AND timestamp <= :end_time
        AND status = 'success'
      GROUP BY source_ip, destination_ip, user_id
      HAVING COUNT(DISTINCT destination_host) > :threshold
      ORDER BY hosts_accessed DESC
    `,
    category: 'threat_hunting',
    parameters: [
      { name: 'start_time', type: 'date', required: true },
      { name: 'end_time', type: 'date', required: true },
      { name: 'threshold', type: 'number', required: false, defaultValue: 5 }
    ],
    tags: ['lateral_movement', 'authentication', 'mitre_ta0008'],
    isPublic: true
  },
  {
    name: 'Suspicious Process Execution',
    description: 'Identify suspicious process execution chains',
    sql: `
      SELECT
        host_id,
        parent_process,
        process_name,
        command_line,
        user_context,
        COUNT(*) as execution_count,
        ARRAY_AGG(DISTINCT process_hash) as hashes
      FROM process_events
      WHERE timestamp >= :start_time
        AND (
          command_line LIKE '%powershell%encoded%'
          OR command_line LIKE '%certutil%-urlcache%'
          OR command_line LIKE '%bitsadmin%transfer%'
          OR parent_process IN ('winword.exe', 'excel.exe', 'outlook.exe')
        )
      GROUP BY host_id, parent_process, process_name, command_line, user_context
      ORDER BY execution_count DESC
    `,
    category: 'threat_hunting',
    parameters: [{ name: 'start_time', type: 'date', required: true }],
    tags: ['process_execution', 'living_off_the_land', 'mitre_t1059'],
    isPublic: true
  },

  // IOC Search Queries
  {
    name: 'IP IOC Search',
    description: 'Search for known malicious IP addresses across all data sources',
    sql: `
      SELECT
        data_source,
        timestamp,
        source_ip,
        destination_ip,
        event_type,
        raw_event
      FROM unified_security_view
      WHERE (source_ip IN (:ioc_list) OR destination_ip IN (:ioc_list))
        AND timestamp >= :start_time
      ORDER BY timestamp DESC
      LIMIT :max_results
    `,
    category: 'ioc_search',
    parameters: [
      { name: 'ioc_list', type: 'array', required: true },
      { name: 'start_time', type: 'date', required: true },
      { name: 'max_results', type: 'number', required: false, defaultValue: 1000 }
    ],
    tags: ['ioc', 'ip_address', 'threat_intel'],
    isPublic: true
  },
  {
    name: 'Hash IOC Search',
    description: 'Search for file hashes across endpoint and network data',
    sql: `
      SELECT
        event_source,
        timestamp,
        host_id,
        file_path,
        file_hash_md5,
        file_hash_sha256,
        action,
        user_context
      FROM file_events
      WHERE (file_hash_md5 IN (:hashes) OR file_hash_sha256 IN (:hashes))
        AND timestamp >= :start_time
      UNION ALL
      SELECT
        'network' as event_source,
        timestamp,
        source_host as host_id,
        url as file_path,
        response_hash_md5 as file_hash_md5,
        response_hash_sha256 as file_hash_sha256,
        'download' as action,
        NULL as user_context
      FROM network_events
      WHERE (response_hash_md5 IN (:hashes) OR response_hash_sha256 IN (:hashes))
        AND timestamp >= :start_time
      ORDER BY timestamp DESC
    `,
    category: 'ioc_search',
    parameters: [
      { name: 'hashes', type: 'array', required: true },
      { name: 'start_time', type: 'date', required: true }
    ],
    tags: ['ioc', 'file_hash', 'malware'],
    isPublic: true
  },

  // Anomaly Detection Queries
  {
    name: 'Unusual Login Times',
    description: 'Detect logins outside normal business hours for each user',
    sql: `
      WITH user_baseline AS (
        SELECT
          user_id,
          AVG(EXTRACT(HOUR FROM timestamp)) as avg_hour,
          STDDEV(EXTRACT(HOUR FROM timestamp)) as stddev_hour
        FROM authentication_events
        WHERE timestamp >= :baseline_start
          AND timestamp < :baseline_end
          AND status = 'success'
        GROUP BY user_id
      )
      SELECT
        a.user_id,
        a.timestamp,
        a.source_ip,
        a.destination_host,
        EXTRACT(HOUR FROM a.timestamp) as login_hour,
        b.avg_hour,
        b.stddev_hour,
        ABS(EXTRACT(HOUR FROM a.timestamp) - b.avg_hour) / NULLIF(b.stddev_hour, 0) as z_score
      FROM authentication_events a
      JOIN user_baseline b ON a.user_id = b.user_id
      WHERE a.timestamp >= :detection_start
        AND a.status = 'success'
        AND ABS(EXTRACT(HOUR FROM a.timestamp) - b.avg_hour) / NULLIF(b.stddev_hour, 0) > :z_threshold
      ORDER BY z_score DESC
    `,
    category: 'anomaly_detection',
    parameters: [
      { name: 'baseline_start', type: 'date', required: true },
      { name: 'baseline_end', type: 'date', required: true },
      { name: 'detection_start', type: 'date', required: true },
      { name: 'z_threshold', type: 'number', required: false, defaultValue: 2.5 }
    ],
    tags: ['anomaly', 'user_behavior', 'authentication'],
    isPublic: true
  },
  {
    name: 'Data Exfiltration Detection',
    description: 'Detect unusual data transfer volumes that may indicate exfiltration',
    sql: `
      WITH daily_baseline AS (
        SELECT
          source_ip,
          AVG(bytes_out) as avg_bytes,
          STDDEV(bytes_out) as stddev_bytes,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY bytes_out) as p95_bytes
        FROM network_flows
        WHERE timestamp >= :baseline_start AND timestamp < :baseline_end
        GROUP BY source_ip
      )
      SELECT
        n.source_ip,
        n.destination_ip,
        n.destination_port,
        DATE(n.timestamp) as transfer_date,
        SUM(n.bytes_out) as total_bytes,
        b.avg_bytes,
        b.p95_bytes,
        SUM(n.bytes_out) / NULLIF(b.avg_bytes, 0) as ratio_to_baseline
      FROM network_flows n
      LEFT JOIN daily_baseline b ON n.source_ip = b.source_ip
      WHERE n.timestamp >= :detection_start
      GROUP BY n.source_ip, n.destination_ip, n.destination_port, DATE(n.timestamp), b.avg_bytes, b.p95_bytes
      HAVING SUM(n.bytes_out) > COALESCE(b.p95_bytes, :default_threshold) * :multiplier
      ORDER BY total_bytes DESC
    `,
    category: 'anomaly_detection',
    parameters: [
      { name: 'baseline_start', type: 'date', required: true },
      { name: 'baseline_end', type: 'date', required: true },
      { name: 'detection_start', type: 'date', required: true },
      { name: 'default_threshold', type: 'number', required: false, defaultValue: 1073741824 },
      { name: 'multiplier', type: 'number', required: false, defaultValue: 3 }
    ],
    tags: ['anomaly', 'exfiltration', 'data_loss'],
    isPublic: true
  },

  // Correlation Queries
  {
    name: 'Attack Chain Correlation',
    description: 'Correlate multiple security events to identify potential attack chains',
    sql: `
      WITH reconnaissance AS (
        SELECT host_id, MIN(timestamp) as recon_time
        FROM security_events
        WHERE event_type IN ('port_scan', 'vulnerability_scan', 'dns_enumeration')
          AND timestamp >= :start_time
        GROUP BY host_id
      ),
      initial_access AS (
        SELECT host_id, MIN(timestamp) as access_time, attack_vector
        FROM security_events
        WHERE event_type IN ('exploit_attempt', 'phishing_click', 'credential_theft')
          AND timestamp >= :start_time
        GROUP BY host_id, attack_vector
      ),
      execution AS (
        SELECT host_id, MIN(timestamp) as exec_time, process_name
        FROM process_events
        WHERE is_suspicious = true AND timestamp >= :start_time
        GROUP BY host_id, process_name
      ),
      persistence AS (
        SELECT host_id, MIN(timestamp) as persist_time, persistence_type
        FROM security_events
        WHERE event_type IN ('registry_mod', 'scheduled_task', 'service_install')
          AND timestamp >= :start_time
        GROUP BY host_id, persistence_type
      )
      SELECT
        COALESCE(r.host_id, i.host_id, e.host_id, p.host_id) as target_host,
        r.recon_time,
        i.access_time,
        i.attack_vector,
        e.exec_time,
        e.process_name,
        p.persist_time,
        p.persistence_type,
        CASE
          WHEN r.recon_time IS NOT NULL AND i.access_time IS NOT NULL
               AND e.exec_time IS NOT NULL AND p.persist_time IS NOT NULL
          THEN 'complete_chain'
          WHEN i.access_time IS NOT NULL AND e.exec_time IS NOT NULL
          THEN 'active_compromise'
          ELSE 'partial_indicators'
        END as chain_status
      FROM reconnaissance r
      FULL OUTER JOIN initial_access i ON r.host_id = i.host_id
      FULL OUTER JOIN execution e ON COALESCE(r.host_id, i.host_id) = e.host_id
      FULL OUTER JOIN persistence p ON COALESCE(r.host_id, i.host_id, e.host_id) = p.host_id
      WHERE (i.access_time IS NOT NULL OR e.exec_time IS NOT NULL)
      ORDER BY chain_status, COALESCE(r.recon_time, i.access_time, e.exec_time, p.persist_time)
    `,
    category: 'correlation',
    parameters: [{ name: 'start_time', type: 'date', required: true }],
    tags: ['correlation', 'attack_chain', 'kill_chain'],
    isPublic: true
  },
  {
    name: 'User Compromise Indicators',
    description: 'Correlate multiple indicators suggesting user account compromise',
    sql: `
      SELECT
        user_id,
        COUNT(DISTINCT CASE WHEN event_type = 'failed_login' THEN 1 END) as failed_logins,
        COUNT(DISTINCT CASE WHEN event_type = 'password_change' THEN 1 END) as password_changes,
        COUNT(DISTINCT CASE WHEN event_type = 'mfa_disabled' THEN 1 END) as mfa_changes,
        COUNT(DISTINCT source_ip) as unique_ips,
        COUNT(DISTINCT geo_country) as unique_countries,
        COUNT(DISTINCT user_agent) as unique_agents,
        BOOL_OR(is_tor_exit) as tor_usage,
        BOOL_OR(is_vpn) as vpn_usage,
        MIN(timestamp) as first_event,
        MAX(timestamp) as last_event,
        CASE
          WHEN COUNT(DISTINCT geo_country) > 3 AND BOOL_OR(is_tor_exit) THEN 'critical'
          WHEN COUNT(DISTINCT geo_country) > 2 OR COUNT(DISTINCT source_ip) > 10 THEN 'high'
          WHEN COUNT(DISTINCT source_ip) > 5 THEN 'medium'
          ELSE 'low'
        END as risk_level
      FROM user_activity_events
      WHERE timestamp >= :start_time AND timestamp <= :end_time
      GROUP BY user_id
      HAVING COUNT(*) > :min_events
      ORDER BY
        CASE
          WHEN risk_level = 'critical' THEN 1
          WHEN risk_level = 'high' THEN 2
          WHEN risk_level = 'medium' THEN 3
          ELSE 4
        END,
        unique_countries DESC
    `,
    category: 'correlation',
    parameters: [
      { name: 'start_time', type: 'date', required: true },
      { name: 'end_time', type: 'date', required: true },
      { name: 'min_events', type: 'number', required: false, defaultValue: 5 }
    ],
    tags: ['correlation', 'account_compromise', 'user_behavior'],
    isPublic: true
  }
];

export function getPrebuiltQueryByName(
  name: string
): PrebuiltQueryDefinition | undefined {
  return PREBUILT_QUERIES.find(q => q.name === name);
}

export function getPrebuiltQueriesByCategory(
  category: QueryCategory
): PrebuiltQueryDefinition[] {
  return PREBUILT_QUERIES.filter(q => q.category === category);
}
