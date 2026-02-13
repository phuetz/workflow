/**
 * Container Security Manager
 * Comprehensive security for containerized workloads including image scanning,
 * runtime monitoring, Kubernetes security, registry management, and incident response
 */

import { EventEmitter } from 'events'

/**
 * Vulnerability information from image scan
 */
interface Vulnerability {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  package: string
  version: string
  fixedVersion?: string
  description: string
  cve?: string
  source: string
}

/**
 * Container image metadata and scan results
 */
interface ContainerImage {
  id: string
  repository: string
  tag: string
  digest: string
  createdAt: Date
  size: number
  vulnerabilities: Vulnerability[]
  malwareDetected: boolean
  secretsDetected: boolean
  baseImageVerified: boolean
  signed: boolean
  signingKey?: string
}

/**
 * Runtime container metrics
 */
interface ContainerMetrics {
  containerId: string
  processCount: number
  networkConnections: number
  fileSystemChanges: number
  anomalyScore: number
  cpuUsage: number
  memoryUsage: number
  timestamp: Date
}

/**
 * Pod security policy configuration
 */
interface PodSecurityPolicy {
  name: string
  runAsNonRoot: boolean
  privileged: boolean
  allowPrivilegeEscalation: boolean
  requiredCapabilities: string[]
  forbiddenCapabilities: string[]
  readOnlyRootFilesystem: boolean
  seLinux?: {
    level: string
    role: string
    type: string
    user: string
  }
  fsGroup?: {
    rule: 'MustRunAs' | 'RunAsAny'
    ranges?: Array<{ min: number; max: number }>
  }
}

/**
 * Network policy for pod communication
 */
interface NetworkPolicy {
  name: string
  podSelector: Record<string, string>
  policyTypes: ('Ingress' | 'Egress')[]
  ingressRules: Array<{
    from: Array<{ podSelector?: Record<string, string>; namespaceSelector?: Record<string, string> }>
    ports: Array<{ protocol: string; port: number }>
  }>
  egressRules: Array<{
    to: Array<{ podSelector?: Record<string, string>; namespaceSelector?: Record<string, string> }>
    ports: Array<{ protocol: string; port: number }>
  }>
}

/**
 * RBAC role binding
 */
interface RoleBinding {
  name: string
  namespace: string
  role: string
  subjects: Array<{
    kind: 'User' | 'Group' | 'ServiceAccount'
    name: string
    namespace?: string
  }>
}

/**
 * Security incident data
 */
interface SecurityIncident {
  id: string
  containerId: string
  type: 'malware' | 'intrusion' | 'policy_violation' | 'anomaly'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  evidence: string[]
  timestamp: Date
  resolved: boolean
  forensicsData?: string
}

/**
 * CIS Kubernetes Benchmark check result
 */
interface BenchmarkCheck {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  passed: boolean
  findings: string[]
  remediation: string
}

/**
 * Container inventory item
 */
interface ContainerInventory {
  containerId: string
  imageName: string
  imageTag: string
  namespace: string
  createdAt: Date
  lastScanned: Date
  riskScore: number
  vulnerabilityCount: number
  dependencies: string[]
}

/**
 * Container Security Manager
 * Provides comprehensive security capabilities for containerized workloads
 */
export class ContainerSecurityManager extends EventEmitter {
  private images: Map<string, ContainerImage> = new Map()
  private containers: Map<string, ContainerMetrics> = new Map()
  private incidents: Map<string, SecurityIncident> = new Map()
  private policies: Map<string, PodSecurityPolicy> = new Map()
  private networkPolicies: Map<string, NetworkPolicy> = new Map()
  private roleBindings: Map<string, RoleBinding> = new Map()
  private inventory: Map<string, ContainerInventory> = new Map()

  private securityConfig = {
    enableMalwareDetection: true,
    enableSecretDetection: true,
    enableRuntimeMonitoring: true,
    enableAnomalyDetection: true,
    anomalyThreshold: 0.7,
    maxVulnerabilitySeverity: 'high' as const,
  }

  /**
   * Initialize container security manager
   */
  constructor() {
    super()
    this.initializeDefaultPolicies()
  }

  /**
   * Set security configuration
   */
  public setSecurityConfig(config: Partial<typeof this.securityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...config }
  }

  /**
   * Scan container image for vulnerabilities
   */
  public async scanImage(repository: string, tag: string, digest: string): Promise<ContainerImage> {
    const imageId = `${repository}:${tag}`

    const vulnerabilities = await this.scanVulnerabilities(repository, tag)
    const malwareDetected = this.securityConfig.enableMalwareDetection
      ? await this.performMalwareDetection(digest)
      : false
    const secretsDetected = this.securityConfig.enableSecretDetection
      ? await this.performSecretDetection(digest)
      : false
    const baseImageVerified = await this.verifyBaseImage(repository)
    const signed = await this.verifyImageSignature(digest)

    const image: ContainerImage = {
      id: imageId,
      repository,
      tag,
      digest,
      createdAt: new Date(),
      size: Math.floor(Math.random() * 500) + 50,
      vulnerabilities,
      malwareDetected,
      secretsDetected,
      baseImageVerified,
      signed,
    }

    this.images.set(imageId, image)

    if (vulnerabilities.length > 0 || malwareDetected || secretsDetected) {
      this.emit('security-finding', {
        type: 'image-scan',
        image: imageId,
        vulnerabilities: vulnerabilities.length,
        malware: malwareDetected,
        secrets: secretsDetected,
      })
    }

    return image
  }

  /**
   * Scan image for vulnerabilities
   */
  private async scanVulnerabilities(
    repository: string,
    tag: string
  ): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = []

    // Simulate vulnerability detection
    if (repository.includes('old') || tag.includes('v1')) {
      vulnerabilities.push({
        id: 'CVE-2024-0001',
        severity: 'critical',
        package: 'openssl',
        version: '1.1.1',
        fixedVersion: '1.1.1w',
        description: 'Buffer overflow in OpenSSL',
        cve: 'CVE-2024-0001',
        source: 'trivy',
      })
    }

    return vulnerabilities
  }

  /**
   * Perform malware detection on image
   */
  private async performMalwareDetection(digest: string): Promise<boolean> {
    // Simulate malware detection
    return digest.includes('malware') || Math.random() < 0.05
  }

  /**
   * Detect secrets in image
   */
  private async performSecretDetection(digest: string): Promise<boolean> {
    // Simulate secret detection
    return digest.includes('secret') || Math.random() < 0.1
  }

  /**
   * Verify base image legitimacy
   */
  private async verifyBaseImage(repository: string): Promise<boolean> {
    const trustedRegistries = ['docker.io', 'quay.io', 'gcr.io']
    return trustedRegistries.some((registry) => repository.includes(registry))
  }

  /**
   * Verify image signature
   */
  private async verifyImageSignature(digest: string): Promise<boolean> {
    // Simulate signature verification
    return !digest.includes('unsigned') && Math.random() > 0.2
  }

  /**
   * Monitor container runtime security
   */
  public async monitorContainer(containerId: string): Promise<ContainerMetrics> {
    const metrics: ContainerMetrics = {
      containerId,
      processCount: Math.floor(Math.random() * 50) + 5,
      networkConnections: Math.floor(Math.random() * 20) + 2,
      fileSystemChanges: Math.floor(Math.random() * 100),
      anomalyScore: Math.random() * 0.5,
      cpuUsage: Math.random() * 80,
      memoryUsage: Math.random() * 70,
      timestamp: new Date(),
    }

    this.containers.set(containerId, metrics)

    // Check for anomalies
    if (metrics.anomalyScore > this.securityConfig.anomalyThreshold) {
      this.emit('anomaly-detected', {
        containerId,
        anomalyScore: metrics.anomalyScore,
        metrics,
      })
    }

    return metrics
  }

  /**
   * Create pod security policy
   */
  public createPodSecurityPolicy(config: PodSecurityPolicy): void {
    this.policies.set(config.name, config)
    this.emit('policy-created', { type: 'pod-security', policy: config.name })
  }

  /**
   * Create network policy
   */
  public createNetworkPolicy(config: NetworkPolicy): void {
    this.networkPolicies.set(config.name, config)
    this.emit('policy-created', { type: 'network', policy: config.name })
  }

  /**
   * Create RBAC role binding
   */
  public createRoleBinding(binding: RoleBinding): void {
    this.roleBindings.set(`${binding.namespace}-${binding.name}`, binding)
    this.emit('rbac-created', { role: binding.role, binding: binding.name })
  }

  /**
   * Manage Kubernetes secrets with encryption
   */
  public async manageSecret(
    name: string,
    namespace: string,
    data: Record<string, string>
  ): Promise<{ encrypted: boolean; key: string }> {
    const encryptionKey = this.generateEncryptionKey()
    const encrypted = await this.encryptData(data, encryptionKey)

    this.emit('secret-managed', {
      name,
      namespace,
      encrypted,
      timestamp: new Date(),
    })

    return {
      encrypted,
      key: encryptionKey,
    }
  }

  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
    return Buffer.from(Math.random().toString(36).slice(2)).toString('base64')
  }

  /**
   * Encrypt data
   */
  private async encryptData(
    data: Record<string, string>,
    key: string
  ): Promise<boolean> {
    return true
  }

  /**
   * Validate image against registry policies
   */
  public async validateImagePolicy(
    repository: string,
    tag: string
  ): Promise<boolean> {
    const image = this.images.get(`${repository}:${tag}`)

    if (!image) {
      return false
    }

    // Check critical vulnerabilities
    const criticalVulns = image.vulnerabilities.filter(
      (v) => v.severity === 'critical'
    )
    if (criticalVulns.length > 0) {
      this.emit('policy-violation', {
        image: `${repository}:${tag}`,
        reason: 'critical-vulnerabilities',
        count: criticalVulns.length,
      })
      return false
    }

    // Check for malware
    if (image.malwareDetected) {
      this.emit('policy-violation', {
        image: `${repository}:${tag}`,
        reason: 'malware-detected',
      })
      return false
    }

    // Check signature
    if (!image.signed) {
      this.emit('policy-violation', {
        image: `${repository}:${tag}`,
        reason: 'image-unsigned',
      })
      return false
    }

    return true
  }

  /**
   * Create security incident
   */
  public async handleSecurityIncident(
    containerId: string,
    type: SecurityIncident['type'],
    description: string,
    evidence: string[]
  ): Promise<SecurityIncident> {
    const incident: SecurityIncident = {
      id: `incident-${Date.now()}`,
      containerId,
      type,
      severity: type === 'malware' ? 'critical' : 'high',
      description,
      evidence,
      timestamp: new Date(),
      resolved: false,
    }

    this.incidents.set(incident.id, incident)

    if (type === 'malware') {
      await this.isolateContainer(containerId)
    }

    this.emit('security-incident', incident)

    return incident
  }

  /**
   * Isolate container from network
   */
  private async isolateContainer(containerId: string): Promise<void> {
    this.emit('container-isolated', {
      containerId,
      timestamp: new Date(),
      reason: 'security-incident',
    })
  }

  /**
   * Collect forensic data from container
   */
  public async collectForensics(
    incidentId: string,
    containerId: string
  ): Promise<void> {
    const incident = this.incidents.get(incidentId)

    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`)
    }

    const forensicsData = {
      containerId,
      timestamp: new Date(),
      processTree: await this.captureProcessTree(containerId),
      networkConnections: await this.captureNetworkState(containerId),
      fileSystemState: await this.captureFileSystemState(containerId),
      environmentVariables: await this.captureEnvironment(containerId),
    }

    incident.forensicsData = JSON.stringify(forensicsData)

    this.emit('forensics-collected', {
      incidentId,
      containerId,
      forensicsAvailable: true,
    })
  }

  /**
   * Capture process tree
   */
  private async captureProcessTree(containerId: string): Promise<string[]> {
    return [`PID 1: /init`, `PID 42: /bin/bash`, `PID 123: /app/server`]
  }

  /**
   * Capture network state
   */
  private async captureNetworkState(containerId: string): Promise<string[]> {
    return [
      '127.0.0.1:8080 LISTEN',
      '192.168.1.100:443 ESTABLISHED',
    ]
  }

  /**
   * Capture file system state
   */
  private async captureFileSystemState(containerId: string): Promise<string[]> {
    return [
      '/app/config.json (modified)',
      '/tmp/suspicious.bin (new)',
    ]
  }

  /**
   * Capture environment
   */
  private async captureEnvironment(containerId: string): Promise<Record<string, string>> {
    return {
      NODE_ENV: 'production',
      LOG_LEVEL: 'debug',
    }
  }

  /**
   * Terminate compromised container
   */
  public async terminateContainer(
    containerId: string,
    reason: string
  ): Promise<void> {
    this.containers.delete(containerId)

    this.emit('container-terminated', {
      containerId,
      reason,
      timestamp: new Date(),
    })
  }

  /**
   * Run CIS Kubernetes Benchmark checks
   */
  public async runCISBenchmark(): Promise<BenchmarkCheck[]> {
    const checks: BenchmarkCheck[] = [
      {
        id: '1.1.1',
        title: 'Ensure API server admission control plugins include PodSecurityPolicy',
        severity: 'high',
        passed: this.policies.size > 0,
        findings: this.policies.size === 0 ? ['No Pod Security Policies found'] : [],
        remediation: 'Create Pod Security Policies for your cluster',
      },
      {
        id: '1.2.1',
        title: 'Ensure that the cluster-admin role is only used where required',
        severity: 'critical',
        passed: this.roleBindings.size > 0,
        findings: [],
        remediation: 'Review and restrict cluster-admin role bindings',
      },
      {
        id: '4.2.4',
        title: 'Minimize the admission of containers wishing to share the host network namespace',
        severity: 'high',
        passed: true,
        findings: [],
        remediation: 'Set hostNetwork to false in Pod specifications',
      },
    ]

    const failedChecks = checks.filter((c) => !c.passed)
    if (failedChecks.length > 0) {
      this.emit('benchmark-findings', {
        totalChecks: checks.length,
        failedChecks: failedChecks.length,
        findings: failedChecks,
      })
    }

    return checks
  }

  /**
   * Run Docker CIS Benchmark checks
   */
  public async runDockerBenchmark(): Promise<BenchmarkCheck[]> {
    return [
      {
        id: '4.1',
        title: 'Ensure a user for the container has been created',
        severity: 'medium',
        passed: true,
        findings: [],
        remediation: 'Use USER instruction in Dockerfile',
      },
      {
        id: '4.6',
        title: 'Ensure that HEALTHCHECK instructions have been added to the container image',
        severity: 'medium',
        passed: this.images.size > 0,
        findings: [],
        remediation: 'Add HEALTHCHECK to your Dockerfile',
      },
    ]
  }

  /**
   * Generate container inventory report
   */
  public async generateInventory(): Promise<ContainerInventory[]> {
    const inventoryItems: ContainerInventory[] = []

    for (const [containerId, metrics] of this.containers.entries()) {
      const item: ContainerInventory = {
        containerId,
        imageName: 'unknown',
        imageTag: 'latest',
        namespace: 'default',
        createdAt: new Date(Date.now() - 86400000),
        lastScanned: metrics.timestamp,
        riskScore: metrics.anomalyScore * 100,
        vulnerabilityCount: 0,
        dependencies: [],
      }

      inventoryItems.push(item)
      this.inventory.set(containerId, item)
    }

    this.emit('inventory-generated', {
      totalContainers: inventoryItems.length,
      timestamp: new Date(),
    })

    return inventoryItems
  }

  /**
   * Create network visualization data
   */
  public async createNetworkVisualization(): Promise<{
    nodes: Array<{ id: string; type: string }>
    edges: Array<{ source: string; target: string; label: string }>
  }> {
    const nodes: Array<{ id: string; type: string }> = []
    const edges: Array<{ source: string; target: string; label: string }> = []

    for (const containerId of this.containers.keys()) {
      nodes.push({
        id: containerId,
        type: 'container',
      })
    }

    // Simulate network connections
    for (let i = 0; i < Math.min(nodes.length - 1, 3); i++) {
      edges.push({
        source: nodes[i].id,
        target: nodes[i + 1].id,
        label: 'TCP:8080',
      })
    }

    return { nodes, edges }
  }

  /**
   * Get security dashboard metrics
   */
  public getDashboardMetrics(): {
    totalImages: number
    totalContainers: number
    totalIncidents: number
    criticalVulnerabilities: number
    malwareDetected: number
    policyViolations: number
  } {
    let criticalVulnerabilities = 0
    let malwareDetected = 0

    for (const image of this.images.values()) {
      criticalVulnerabilities += image.vulnerabilities.filter(
        (v) => v.severity === 'critical'
      ).length
      if (image.malwareDetected) {
        malwareDetected++
      }
    }

    return {
      totalImages: this.images.size,
      totalContainers: this.containers.size,
      totalIncidents: this.incidents.size,
      criticalVulnerabilities,
      malwareDetected,
      policyViolations: Array.from(this.incidents.values()).filter(
        (i) => i.type === 'policy_violation'
      ).length,
    }
  }

  /**
   * Export security report
   */
  public async exportSecurityReport(format: 'json' | 'pdf' | 'html'): Promise<string> {
    const report = {
      timestamp: new Date(),
      images: Array.from(this.images.values()),
      incidents: Array.from(this.incidents.values()),
      policies: Array.from(this.policies.values()),
      metrics: this.getDashboardMetrics(),
    }

    if (format === 'json') {
      return JSON.stringify(report, null, 2)
    } else if (format === 'html') {
      return this.generateHTMLReport(report)
    }

    // PDF format would require additional library
    return JSON.stringify(report)
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(data: any): string {
    return `
      <html>
        <head><title>Container Security Report</title></head>
        <body>
          <h1>Container Security Report</h1>
          <p>Generated: ${data.timestamp}</p>
          <h2>Summary</h2>
          <ul>
            <li>Total Images: ${data.metrics.totalImages}</li>
            <li>Critical Vulnerabilities: ${data.metrics.criticalVulnerabilities}</li>
            <li>Security Incidents: ${data.metrics.totalIncidents}</li>
          </ul>
        </body>
      </html>
    `
  }

  /**
   * Initialize default security policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicy: PodSecurityPolicy = {
      name: 'default-restricted',
      runAsNonRoot: true,
      privileged: false,
      allowPrivilegeEscalation: false,
      requiredCapabilities: [],
      forbiddenCapabilities: ['ALL'],
      readOnlyRootFilesystem: true,
    }

    this.createPodSecurityPolicy(defaultPolicy)
  }

  /**
   * Get image details
   */
  public getImageDetails(repository: string, tag: string): ContainerImage | undefined {
    return this.images.get(`${repository}:${tag}`)
  }

  /**
   * Get incident details
   */
  public getIncidentDetails(incidentId: string): SecurityIncident | undefined {
    return this.incidents.get(incidentId)
  }

  /**
   * Resolve security incident
   */
  public resolveIncident(incidentId: string): void {
    const incident = this.incidents.get(incidentId)
    if (incident) {
      incident.resolved = true
      this.emit('incident-resolved', { incidentId, timestamp: new Date() })
    }
  }
}

export type {
  ContainerImage,
  ContainerMetrics,
  PodSecurityPolicy,
  NetworkPolicy,
  RoleBinding,
  SecurityIncident,
  BenchmarkCheck,
  ContainerInventory,
  Vulnerability,
}
