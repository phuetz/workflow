/**
 * Secure Communication Service
 * TLS/mTLS, secure WebSocket, encrypted messaging, and secure channels
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import * as tls from 'tls';
import * as https from 'https';
import { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';

export interface SecureChannelConfig {
  id: string;
  name: string;
  type: ChannelType;
  encryption: EncryptionConfig;
  authentication: AuthenticationConfig;
  endpoints: string[];
  metadata: Record<string, unknown>;
}

export enum ChannelType {
  TLS = 'tls',
  MTLS = 'mtls',
  WEBSOCKET_TLS = 'websocket_tls',
  ENCRYPTED_MESSAGING = 'encrypted_messaging',
  VPN = 'vpn',
  SSH_TUNNEL = 'ssh_tunnel'
}

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'TLS-1.3' | 'TLS-1.2';
  keyExchange: 'ECDH' | 'RSA' | 'DHE';
  cipherSuites: string[];
  certificateValidation: boolean;
  perfectForwardSecrecy: boolean;
}

export interface AuthenticationConfig {
  type: 'certificate' | 'psk' | 'token' | 'mutual_tls';
  certificates?: CertificateInfo[];
  presharedKeys?: Record<string, string>;
  tokenValidation?: (token: string) => Promise<boolean>;
  clientCertRequired?: boolean;
}

export interface CertificateInfo {
  id: string;
  name: string;
  certificate: string; // PEM format
  privateKey: string; // PEM format
  chain?: string[]; // Certificate chain
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  fingerprint: string;
  keyUsage: string[];
  metadata: Record<string, unknown>;
}

export interface SecureConnection {
  id: string;
  channelId: string;
  remoteAddress: string;
  protocol: string;
  tlsVersion?: string;
  cipher?: string;
  authenticated: boolean;
  clientCertificate?: CertificateInfo;
  establishedAt: Date;
  lastActivity: Date;
  bytesReceived: number;
  bytesSent: number;
  metadata: Record<string, unknown>;
}

export interface EncryptedMessage {
  id: string;
  channelId: string;
  sender: string;
  recipients: string[];
  content: string; // Encrypted
  signature?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface MessageEncryption {
  algorithm: string;
  keyId: string;
  iv: string;
  authTag?: string;
  additionalData?: string;
}

export interface SecureWebSocketConfig {
  port: number;
  host?: string;
  tlsOptions: {
    cert: string;
    key: string;
    ca?: string;
    requestCert?: boolean;
    rejectUnauthorized?: boolean;
  };
  authentication: {
    required: boolean;
    validator: (request: IncomingMessage) => Promise<boolean>;
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotationInterval: number;
  };
}

export interface TunnelConfig {
  type: 'ssh' | 'vpn' | 'proxy';
  localPort: number;
  remoteHost: string;
  remotePort: number;
  authentication: {
    username?: string;
    password?: string;
    privateKey?: string;
    certificate?: string;
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
  };
}

export class SecureCommunicationService extends EventEmitter {
  private channels: Map<string, SecureChannelConfig> = new Map();
  private connections: Map<string, SecureConnection> = new Map();
  private certificates: Map<string, CertificateInfo> = new Map();
  private webSocketServers: Map<string, WebSocketServer> = new Map();
  private encryptionKeys: Map<string, Buffer> = new Map();
  private messageQueue: Map<string, EncryptedMessage[]> = new Map();
  private tunnels: Map<string, unknown> = new Map();
  
  constructor() {
    super();
    this.initializeDefaultCertificates();
  }
  
  private initializeDefaultCertificates(): void {
    // In production, these would be loaded from secure storage
    const defaultCert = this.generateSelfSignedCertificate('localhost');
    this.certificates.set(defaultCert.id, defaultCert);
  }
  
  private generateSelfSignedCertificate(commonName: string): CertificateInfo {
    // Generate RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    // Generate self-signed certificate (simplified)
    const cert = this.createSelfSignedCert(commonName, publicKey, privateKey);
    
    return {
      id: crypto.randomUUID(),
      name: `Self-signed certificate for ${commonName}`,
      certificate: cert,
      privateKey,
      issuer: `CN=${commonName}`,
      subject: `CN=${commonName}`,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      fingerprint: crypto.createHash('sha256').update(cert).digest('hex'),
      keyUsage: ['digitalSignature', 'keyEncipherment'],
      metadata: { selfSigned: true }
    };
  }
  
  private createSelfSignedCert(commonName: string, publicKey: string, privateKey: string): string {
    // Simplified self-signed certificate creation
    // In production, would use a proper certificate library
    const certData = {
      version: 3,
      serialNumber: crypto.randomBytes(8).toString('hex'),
      issuer: { CN: commonName },
      subject: { CN: commonName },
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      publicKey
    };
    
    const certString = JSON.stringify(certData);
    const signature = crypto.sign('sha256', Buffer.from(certString), privateKey);
    
    // Return PEM-formatted certificate (simplified)
    return `-----BEGIN CERTIFICATE-----\n${Buffer.from(certString + signature.toString('base64')).toString('base64')}\n-----END CERTIFICATE-----`;
  }
  
  // Channel Management
  
  public async createSecureChannel(config: Omit<SecureChannelConfig, 'id'>): Promise<string> {
    const channelId = crypto.randomUUID();
    const channel: SecureChannelConfig = {
      ...config,
      id: channelId
    };
    
    this.channels.set(channelId, channel);
    
    // Initialize channel based on type
    await this.initializeChannel(channel);
    
    this.emit('channelCreated', {
      channelId,
      type: channel.type,
      name: channel.name
    });
    
    return channelId;
  }
  
  private async initializeChannel(channel: SecureChannelConfig): Promise<void> {
    switch (channel.type) {
      case ChannelType.TLS:
      case ChannelType.MTLS:
        await this.initializeTLSChannel(channel);
        break;
      case ChannelType.WEBSOCKET_TLS:
        await this.initializeWebSocketTLSChannel(channel);
        break;
      case ChannelType.ENCRYPTED_MESSAGING:
        await this.initializeEncryptedMessaging(channel);
        break;
      case ChannelType.VPN:
        await this.initializeVPNChannel(channel);
        break;
      case ChannelType.SSH_TUNNEL:
        await this.initializeSSHTunnel(channel);
        break;
    }
  }
  
  private async initializeTLSChannel(channel: SecureChannelConfig): Promise<void> {
    // TLS channel initialization
    const tlsOptions: tls.TlsOptions = {
      rejectUnauthorized: channel.encryption.certificateValidation,
      secureProtocol: channel.encryption.algorithm.includes('1.3') ? 'TLSv1_3_method' : 'TLSv1_2_method'
    };
    
    if (channel.authentication.certificates && channel.authentication.certificates.length > 0) {
      const cert = channel.authentication.certificates[0];
      tlsOptions.cert = cert.certificate;
      tlsOptions.key = cert.privateKey;
      
      if (cert.chain) {
        tlsOptions.ca = cert.chain;
      }
    }
    
    if (channel.type === ChannelType.MTLS) {
      tlsOptions.requestCert = true;
      tlsOptions.rejectUnauthorized = true;
    }
    
    // Configure cipher suites
    if (channel.encryption.cipherSuites.length > 0) {
      tlsOptions.ciphers = channel.encryption.cipherSuites.join(':');
    }
    
    // Store TLS options in channel metadata
    channel.metadata.tlsOptions = tlsOptions;
  }
  
  private async initializeWebSocketTLSChannel(channel: SecureChannelConfig): Promise<void> {
    if (channel.endpoints.length === 0) {
      throw new Error('WebSocket TLS channel requires at least one endpoint');
    }
    
    const endpoint = channel.endpoints[0];
    const [host, portStr] = endpoint.split(':');
    const port = parseInt(portStr);
    
    const cert = channel.authentication.certificates?.[0];
    if (!cert) {
      throw new Error('WebSocket TLS channel requires a certificate');
    }
    
    const wsConfig: SecureWebSocketConfig = {
      port,
      host,
      tlsOptions: {
        cert: cert.certificate,
        key: cert.privateKey,
        requestCert: channel.type === ChannelType.MTLS,
        rejectUnauthorized: channel.encryption.certificateValidation
      },
      authentication: {
        required: true,
        validator: async (request) => {
          // Custom authentication logic
          const token = request.headers.authorization;
          return token ? await this.validateToken(token) : false;
        }
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keyRotationInterval: 3600000 // 1 hour
      }
    };
    
    const wss = await this.createSecureWebSocketServer(wsConfig);
    this.webSocketServers.set(channel.id, wss);
    
    channel.metadata.webSocketConfig = wsConfig;
  }
  
  private async createSecureWebSocketServer(config: SecureWebSocketConfig): Promise<WebSocketServer> {
    const httpsServer = https.createServer({
      cert: config.tlsOptions.cert,
      key: config.tlsOptions.key,
      ca: config.tlsOptions.ca,
      requestCert: config.tlsOptions.requestCert,
      rejectUnauthorized: config.tlsOptions.rejectUnauthorized
    });
    
    const wss = new WebSocketServer({
      server: httpsServer,
      verifyClient: async (info) => {
        if (config.authentication.required) {
          return await config.authentication.validator(info.req);
        }
        return true;
      }
    });
    
    wss.on('connection', (ws, request) => {
      const connectionId = crypto.randomUUID();
      const connection: SecureConnection = {
        id: connectionId,
        channelId: '', // Will be set by caller
        remoteAddress: request.socket.remoteAddress || 'unknown',
        protocol: 'WebSocket TLS',
        tlsVersion: (request.socket as unknown).tlsVersion,
        cipher: (request.socket as unknown).cipher?.name,
        authenticated: true,
        establishedAt: new Date(),
        lastActivity: new Date(),
        bytesReceived: 0,
        bytesSent: 0,
        metadata: { websocket: true }
      };
      
      this.connections.set(connectionId, connection);
      
      ws.on('message', (data) => {
        connection.lastActivity = new Date();
        connection.bytesReceived += data.length;
        
        if (config.encryption.enabled) {
          const decrypted = this.decryptWebSocketMessage(data.toString(), connection);
          this.emit('secureMessage', {
            connectionId,
            message: decrypted,
            encrypted: true
          });
        } else {
          this.emit('secureMessage', {
            connectionId,
            message: data.toString(),
            encrypted: false
          });
        }
      });
      
      ws.on('close', () => {
        this.connections.delete(connectionId);
        this.emit('connectionClosed', { connectionId });
      });
      
      this.emit('secureConnection', { connectionId, connection });
    });
    
    httpsServer.listen(config.port, config.host);
    
    return wss;
  }
  
  private async initializeEncryptedMessaging(channel: SecureChannelConfig): Promise<void> {
    // Initialize message encryption keys
    const encryptionKey = crypto.randomBytes(32); // 256-bit key
    this.encryptionKeys.set(channel.id, encryptionKey);
    
    // Initialize message queue for this channel
    this.messageQueue.set(channel.id, []);
    
    channel.metadata.encryptionEnabled = true;
    channel.metadata.keyRotationInterval = 3600000; // 1 hour
    
    // Schedule key rotation
    setInterval(() => {
      this.rotateChannelKey(channel.id);
    }, channel.metadata.keyRotationInterval);
  }
  
  private async initializeVPNChannel(channel: SecureChannelConfig): Promise<void> {
    // VPN channel initialization (simplified)
    channel.metadata.vpnConfig = {
      protocol: 'OpenVPN',
      encryption: 'AES-256-CBC',
      authentication: 'HMAC-SHA256',
      dnsServers: ['8.8.8.8', '8.8.4.4']
    };
  }
  
  private async initializeSSHTunnel(channel: SecureChannelConfig): Promise<void> {
    // SSH tunnel initialization
    channel.metadata.sshConfig = {
      host: channel.endpoints[0],
      username: 'tunnel-user',
      compression: true,
      keepaliveInterval: 30000
    };
  }
  
  // TLS/mTLS Operations
  
  public async establishTLSConnection(
    channelId: string,
    target: string,
    options?: Partial<tls.ConnectionOptions>
  ): Promise<string> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }
    
    if (channel.type !== ChannelType.TLS && channel.type !== ChannelType.MTLS) {
      throw new Error('Channel is not a TLS channel');
    }
    
    const [host, portStr] = target.split(':');
    const port = parseInt(portStr);
    
    const tlsOptions = {
      ...channel.metadata.tlsOptions,
      ...options,
      host,
      port
    };
    
    return new Promise((resolve, reject) => {
      const socket = tls.connect(tlsOptions, () => {
        const connectionId = crypto.randomUUID();
        const connection: SecureConnection = {
          id: connectionId,
          channelId,
          remoteAddress: target,
          protocol: 'TLS',
          tlsVersion: socket.getProtocol(),
          cipher: socket.getCipher()?.name,
          authenticated: socket.authorized,
          clientCertificate: this.extractClientCertificate(socket),
          establishedAt: new Date(),
          lastActivity: new Date(),
          bytesReceived: 0,
          bytesSent: 0,
          metadata: { tlsSocket: true }
        };
        
        this.connections.set(connectionId, connection);
        
        socket.on('data', (data) => {
          connection.lastActivity = new Date();
          connection.bytesReceived += data.length;
          this.emit('tlsData', { connectionId, data });
        });
        
        socket.on('close', () => {
          this.connections.delete(connectionId);
          this.emit('connectionClosed', { connectionId });
        });
        
        socket.on('error', (error) => {
          this.emit('connectionError', { connectionId, error });
        });
        
        this.emit('tlsConnectionEstablished', { connectionId, connection });
        resolve(connectionId);
      });
      
      socket.on('error', reject);
    });
  }
  
  private extractClientCertificate(socket: tls.TLSSocket): CertificateInfo | undefined {
    const peerCert = socket.getPeerCertificate();
    if (!peerCert || Object.keys(peerCert).length === 0) {
      return undefined;
    }
    
    return {
      id: crypto.randomUUID(),
      name: `Client Certificate - ${peerCert.subject.CN}`,
      certificate: peerCert.raw.toString('base64'),
      privateKey: '', // Client private key not available
      issuer: this.formatCertificateName(peerCert.issuer),
      subject: this.formatCertificateName(peerCert.subject),
      validFrom: new Date(peerCert.valid_from),
      validTo: new Date(peerCert.valid_to),
      fingerprint: peerCert.fingerprint,
      keyUsage: [],
      metadata: { peer: true }
    };
  }
  
  private formatCertificateName(name: unknown): string {
    if (typeof name === 'string') return name;
    
    const parts = [];
    if (name.CN) parts.push(`CN=${name.CN}`);
    if (name.O) parts.push(`O=${name.O}`);
    if (name.OU) parts.push(`OU=${name.OU}`);
    if (name.C) parts.push(`C=${name.C}`);
    
    return parts.join(', ');
  }
  
  // Message Encryption
  
  public async sendEncryptedMessage(
    channelId: string,
    recipients: string[],
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }
    
    const encryptionKey = this.encryptionKeys.get(channelId);
    if (!encryptionKey) {
      throw new Error('Encryption key not found for channel');
    }
    
    const messageId = crypto.randomUUID();
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    
    const cipher = crypto.createCipher('aes-256-gcm', encryptionKey);
    cipher.setAAD(Buffer.from(messageId)); // Additional authenticated data
    
    let encrypted = cipher.update(content, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Create digital signature
    const signature = await this.signMessage(content, channelId);
    
    const message: EncryptedMessage = {
      id: messageId,
      channelId,
      sender: 'system', // Would be actual sender ID
      recipients,
      content: encrypted,
      signature,
      timestamp: new Date(),
      metadata: {
        encryption: {
          algorithm: 'AES-256-GCM',
          keyId: channelId,
          iv: iv.toString('base64'),
          authTag: authTag.toString('base64')
        },
        ...metadata
      }
    };
    
    // Store message in queue
    const queue = this.messageQueue.get(channelId) || [];
    queue.push(message);
    this.messageQueue.set(channelId, queue);
    
    // Deliver message to recipients
    await this.deliverMessage(message);
    
    this.emit('messageEncrypted', {
      messageId,
      channelId,
      recipients: recipients.length
    });
    
    return messageId;
  }
  
  public async receiveEncryptedMessage(messageId: string): Promise<string> {
    // Find message in queues
    let message: EncryptedMessage | undefined;
    
    for (const queue of this.messageQueue.values()) {
      message = queue.find(m => m.id === messageId);
      if (message) break;
    }
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    const encryptionKey = this.encryptionKeys.get(message.channelId);
    if (!encryptionKey) {
      throw new Error('Encryption key not found');
    }
    
    const encryptionMeta = message.metadata.encryption;
    const _iv = Buffer.from(encryptionMeta.iv, 'base64'); // eslint-disable-line @typescript-eslint/no-unused-vars
    const authTag = Buffer.from(encryptionMeta.authTag, 'base64');
    
    const decipher = crypto.createDecipher('aes-256-gcm', encryptionKey);
    decipher.setAAD(Buffer.from(message.id));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(message.content, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Verify signature
    const signatureValid = await this.verifyMessageSignature(
      decrypted, 
      message.signature, 
      message.channelId
    );
    
    if (!signatureValid) {
      throw new Error('Message signature verification failed');
    }
    
    this.emit('messageDecrypted', {
      messageId,
      channelId: message.channelId,
      signatureValid
    });
    
    return decrypted;
  }
  
  private async signMessage(content: string, channelId: string): Promise<string> {
    const channel = this.channels.get(channelId);
    const cert = channel?.authentication.certificates?.[0];
    
    if (!cert) {
      return ''; // No certificate available for signing
    }
    
    const sign = crypto.createSign('sha256');
    sign.update(content);
    
    return sign.sign(cert.privateKey, 'base64');
  }
  
  private async verifyMessageSignature(
    content: string,
    signature: string | undefined,
    channelId: string
  ): Promise<boolean> {
    if (!signature) return false;
    
    const channel = this.channels.get(channelId);
    const cert = channel?.authentication.certificates?.[0];
    
    if (!cert) return false;
    
    try {
      const verify = crypto.createVerify('sha256');
      verify.update(content);
      
      // Extract public key from certificate
      const publicKey = crypto.createPublicKey(cert.certificate);
      
      return verify.verify(publicKey, signature, 'base64');
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      return false;
    }
  }
  
  private async deliverMessage(message: EncryptedMessage): Promise<void> {
    // In a real implementation, this would deliver to actual recipients
    this.emit('messageDelivery', {
      messageId: message.id,
      recipients: message.recipients,
      timestamp: message.timestamp
    });
  }
  
  // WebSocket Message Encryption
  
  private encryptWebSocketMessage(message: string, connection: SecureConnection): string {
    const key = this.encryptionKeys.get(connection.channelId);
    if (!key) return message;
    
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    
    let encrypted = cipher.update(message, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    });
  }
  
  private decryptWebSocketMessage(encryptedMessage: string, connection: SecureConnection): string {
    const key = this.encryptionKeys.get(connection.channelId);
    if (!key) return encryptedMessage;
    
    try {
      const data = JSON.parse(encryptedMessage);
      const _iv = Buffer.from(data.iv, 'base64'); // eslint-disable-line @typescript-eslint/no-unused-vars
      const authTag = Buffer.from(data.authTag, 'base64');
      
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('WebSocket message decryption failed:', error);
      return encryptedMessage;
    }
  }
  
  // Key Management
  
  private rotateChannelKey(channelId: string): void {
    const newKey = crypto.randomBytes(32);
    const oldKey = this.encryptionKeys.get(channelId);
    
    this.encryptionKeys.set(channelId, newKey);
    
    this.emit('keyRotated', {
      channelId,
      timestamp: new Date(),
      oldKeyFingerprint: oldKey ? crypto.createHash('sha256').update(oldKey).digest('hex') : null,
      newKeyFingerprint: crypto.createHash('sha256').update(newKey).digest('hex')
    });
  }
  
  private async validateToken(token: string): Promise<boolean> {
    // Simplified token validation
    // In production, would validate JWT or other token format
    return token.startsWith('Bearer ') && token.length > 50;
  }
  
  // Certificate Management
  
  public addCertificate(certificate: Omit<CertificateInfo, 'id'>): string {
    const certId = crypto.randomUUID();
    const cert: CertificateInfo = {
      ...certificate,
      id: certId
    };
    
    this.certificates.set(certId, cert);
    
    this.emit('certificateAdded', {
      certificateId: certId,
      subject: cert.subject,
      validTo: cert.validTo
    });
    
    return certId;
  }
  
  public getCertificate(certificateId: string): CertificateInfo | undefined {
    return this.certificates.get(certificateId);
  }
  
  public getAllCertificates(): CertificateInfo[] {
    return Array.from(this.certificates.values());
  }
  
  public deleteCertificate(certificateId: string): boolean {
    const deleted = this.certificates.delete(certificateId);
    
    if (deleted) {
      this.emit('certificateDeleted', { certificateId });
    }
    
    return deleted;
  }
  
  public getCertificateExpiry(): Array<{ certificateId: string; subject: string; daysUntilExpiry: number }> {
    const now = new Date();
    const certs = Array.from(this.certificates.values());
    
    return certs.map(cert => {
      const daysUntilExpiry = Math.ceil((cert.validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        certificateId: cert.id,
        subject: cert.subject,
        daysUntilExpiry
      };
    }).filter(cert => cert.daysUntilExpiry <= 90); // Certificates expiring within 90 days
  }
  
  // Connection Management
  
  public getConnection(connectionId: string): SecureConnection | undefined {
    return this.connections.get(connectionId);
  }
  
  public getAllConnections(channelId?: string): SecureConnection[] {
    const connections = Array.from(this.connections.values());
    
    if (channelId) {
      return connections.filter(conn => conn.channelId === channelId);
    }
    
    return connections;
  }
  
  public closeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;
    
    // Close the actual connection based on type
    // This would vary based on the connection type (WebSocket, TLS socket, etc.)
    
    this.connections.delete(connectionId);
    
    this.emit('connectionClosed', { connectionId });
    
    return true;
  }
  
  // Channel Management
  
  public getChannel(channelId: string): SecureChannelConfig | undefined {
    return this.channels.get(channelId);
  }
  
  public getAllChannels(): SecureChannelConfig[] {
    return Array.from(this.channels.values());
  }
  
  public updateChannel(
    channelId: string,
    updates: Partial<Omit<SecureChannelConfig, 'id'>>
  ): SecureChannelConfig {
    const channel = this.channels.get(channelId);
    
    if (!channel) {
      throw new Error('Channel not found');
    }
    
    Object.assign(channel, updates);
    
    this.emit('channelUpdated', { channelId, updates });
    
    return channel;
  }
  
  public deleteChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;
    
    // Close all connections for this channel
    const channelConnections = this.getAllConnections(channelId);
    for (const connection of channelConnections) {
      this.closeConnection(connection.id);
    }
    
    // Clean up WebSocket server if exists
    const wss = this.webSocketServers.get(channelId);
    if (wss) {
      wss.close();
      this.webSocketServers.delete(channelId);
    }
    
    // Clean up encryption keys
    this.encryptionKeys.delete(channelId);
    this.messageQueue.delete(channelId);
    
    const deleted = this.channels.delete(channelId);
    
    if (deleted) {
      this.emit('channelDeleted', { channelId });
    }
    
    return deleted;
  }
  
  // Statistics and Monitoring
  
  public getStats(): {
    totalChannels: number;
    activeConnections: number;
    certificatesCount: number;
    expiringSoon: number;
    messagesSent: number;
    bytesTransferred: number;
    channelsByType: Record<ChannelType, number>;
  } {
    const connections = Array.from(this.connections.values());
    const certificates = Array.from(this.certificates.values());
    const expiringSoon = this.getCertificateExpiry().length;
    
    const channelsByType: Record<ChannelType, number> = {} as Record<ChannelType, number>;
    Object.values(ChannelType).forEach(type => {
      channelsByType[type] = 0;
    });
    
    for (const channel of this.channels.values()) {
      channelsByType[channel.type]++;
    }
    
    const totalBytesTransferred = connections.reduce(
      (total, conn) => total + conn.bytesReceived + conn.bytesSent,
      0
    );
    
    const totalMessages = Array.from(this.messageQueue.values())
      .reduce((total, queue) => total + queue.length, 0);
    
    return {
      totalChannels: this.channels.size,
      activeConnections: connections.length,
      certificatesCount: certificates.length,
      expiringSoon,
      messagesSent: totalMessages,
      bytesTransferred: totalBytesTransferred,
      channelsByType
    };
  }
  
  // Security Audit
  
  public performSecurityAudit(): {
    weakConfigurations: string[];
    expiredCertificates: string[];
    insecureConnections: string[];
    recommendations: string[];
  } {
    const weakConfigurations: string[] = [];
    const expiredCertificates: string[] = [];
    const insecureConnections: string[] = [];
    const recommendations: string[] = [];
    
    // Check channels for weak configurations
    for (const channel of this.channels.values()) {
      if (!channel.encryption.certificateValidation) {
        weakConfigurations.push(`Channel ${channel.name}: Certificate validation disabled`);
      }
      
      if (!channel.encryption.perfectForwardSecrecy) {
        weakConfigurations.push(`Channel ${channel.name}: Perfect Forward Secrecy not enabled`);
      }
      
      if (channel.encryption.algorithm === 'TLS-1.2') {
        recommendations.push(`Channel ${channel.name}: Consider upgrading to TLS 1.3`);
      }
    }
    
    // Check certificates for expiration
    const now = new Date();
    for (const cert of this.certificates.values()) {
      if (cert.validTo < now) {
        expiredCertificates.push(`Certificate ${cert.subject}: Expired on ${cert.validTo}`);
      }
    }
    
    // Check connections for security issues
    for (const connection of this.connections.values()) {
      if (!connection.authenticated) {
        insecureConnections.push(`Connection ${connection.id}: Not authenticated`);
      }
      
      if (connection.tlsVersion && connection.tlsVersion.startsWith('TLSv1.0')) {
        insecureConnections.push(`Connection ${connection.id}: Using insecure TLS version`);
      }
    }
    
    // General recommendations
    if (this.encryptionKeys.size === 0) {
      recommendations.push('No encryption keys found - consider enabling message encryption');
    }
    
    if (this.certificates.size <= 1) {
      recommendations.push('Consider adding backup certificates for redundancy');
    }
    
    return {
      weakConfigurations,
      expiredCertificates,
      insecureConnections,
      recommendations
    };
  }
  
  // Cleanup
  
  public cleanup(): void {
    // Close all WebSocket servers
    for (const wss of this.webSocketServers.values()) {
      wss.close();
    }
    
    // Clear all data
    this.channels.clear();
    this.connections.clear();
    this.certificates.clear();
    this.webSocketServers.clear();
    this.encryptionKeys.clear();
    this.messageQueue.clear();
    this.tunnels.clear();
    
    this.emit('serviceDestroyed');
  }
}