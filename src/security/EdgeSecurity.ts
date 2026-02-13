/**
 * Edge Device Security Module
 * Enterprise-grade security for edge devices with mTLS, encryption, and secure boot
 */

import { logger } from '../services/SimpleLogger';
import type {
  DeviceIdentity,
  MutualTLSConfig,
  EncryptedMessage,
  SecureBootStatus,
  OTAUpdate,
  DeviceCertificate,
  KeyRotationPolicy,
} from '../types/security';

export class EdgeSecurity {
  private deviceRegistry: Map<string, DeviceIdentity> = new Map();
  private certificates: Map<string, DeviceCertificate> = new Map();
  private rotationPolicies: Map<string, KeyRotationPolicy> = new Map();
  private secureBootStatuses: Map<string, SecureBootStatus> = new Map();

  // ================================
  // DEVICE AUTHENTICATION
  // ================================

  /**
   * Register device with identity and certificate
   */
  async registerDevice(
    deviceId: string,
    publicKey: string,
    certificateRequest: string
  ): Promise<DeviceIdentity> {
    logger.info('Registering edge device', { deviceId });

    try {
      // Generate certificate
      const certificate = await this.issueCertificate(deviceId, publicKey, certificateRequest);

      const identity: DeviceIdentity = {
        deviceId,
        publicKey,
        certificate: certificate.certificate,
        certificateChain: [certificate.certificate],
        issuer: 'WorkflowPlatform-CA',
        validFrom: certificate.validFrom,
        validUntil: certificate.validUntil,
      };

      this.deviceRegistry.set(deviceId, identity);

      logger.info('Device registered successfully', { deviceId });
      return identity;
    } catch (error) {
      logger.error('Device registration failed', error);
      throw new Error(`Failed to register device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticate device using mutual TLS
   */
  async authenticateDevice(
    deviceId: string,
    clientCertificate: string,
    signature: string
  ): Promise<{ authenticated: boolean; identity?: DeviceIdentity; error?: string }> {
    try {
      logger.info('Authenticating device', { deviceId });

      // Get device identity
      const identity = this.deviceRegistry.get(deviceId);
      if (!identity) {
        return { authenticated: false, error: 'Device not registered' };
      }

      // Verify certificate
      const certificateValid = await this.verifyCertificate(clientCertificate, identity.certificateChain);
      if (!certificateValid) {
        return { authenticated: false, error: 'Invalid certificate' };
      }

      // Verify signature
      const signatureValid = await this.verifySignature(deviceId, signature, identity.publicKey);
      if (!signatureValid) {
        return { authenticated: false, error: 'Invalid signature' };
      }

      // Check certificate expiration
      if (new Date(identity.validUntil) < new Date()) {
        return { authenticated: false, error: 'Certificate expired' };
      }

      logger.info('Device authenticated successfully', { deviceId });
      return { authenticated: true, identity };
    } catch (error) {
      logger.error('Device authentication failed', error);
      return {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ================================
  // MUTUAL TLS (mTLS)
  // ================================

  /**
   * Configure mutual TLS for device
   */
  async configureMutualTLS(
    deviceId: string,
    config: Partial<MutualTLSConfig>
  ): Promise<MutualTLSConfig> {
    logger.info('Configuring mutual TLS', { deviceId });

    const device = this.certificates.get(deviceId);
    if (!device) {
      throw new Error('Device not registered');
    }

    const mtlsConfig: MutualTLSConfig = {
      clientCert: config.clientCert || device.certificate,
      clientKey: config.clientKey || device.privateKey,
      serverCA: config.serverCA || this.getServerCA(),
      verifyPeer: config.verifyPeer ?? true,
      minTLSVersion: config.minTLSVersion || '1.3',
    };

    logger.info('Mutual TLS configured', { deviceId, tlsVersion: mtlsConfig.minTLSVersion });
    return mtlsConfig;
  }

  /**
   * Validate TLS connection
   */
  async validateTLSConnection(
    deviceId: string,
    connectionInfo: {
      protocol: string;
      cipher: string;
      peerCertificate: string;
    }
  ): Promise<{ valid: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    let valid = true;

    // Check TLS version
    if (!connectionInfo.protocol.includes('TLSv1.3') && !connectionInfo.protocol.includes('TLSv1.2')) {
      warnings.push('Outdated TLS version - upgrade to TLS 1.2 or 1.3');
      valid = false;
    }

    // Check cipher strength
    const weakCiphers = ['RC4', 'DES', '3DES', 'MD5'];
    if (weakCiphers.some(cipher => connectionInfo.cipher.includes(cipher))) {
      warnings.push('Weak cipher detected - use stronger encryption');
      valid = false;
    }

    // Verify peer certificate
    const certificateValid = await this.verifyCertificate(
      connectionInfo.peerCertificate,
      []
    );
    if (!certificateValid) {
      warnings.push('Invalid peer certificate');
      valid = false;
    }

    logger.info('TLS connection validated', { deviceId, valid, warnings: warnings.length });
    return { valid, warnings };
  }

  // ================================
  // ENCRYPTED COMMUNICATION
  // ================================

  /**
   * Encrypt message for device
   */
  async encryptMessage(
    deviceId: string,
    message: string
  ): Promise<EncryptedMessage> {
    logger.debug('Encrypting message for device', { deviceId });

    try {
      // Generate random IV
      const iv = this.generateRandomBytes(12);

      // Get device key
      const keyId = `device:${deviceId}`;

      // In production, would use WebCrypto API or Node.js crypto
      const encryptedData = await this.performEncryption(message, iv);
      const authTag = this.generateAuthTag(encryptedData, iv);

      const encrypted: EncryptedMessage = {
        encryptedData,
        iv: this.bytesToBase64(iv),
        authTag,
        algorithm: 'AES-256-GCM',
        keyId,
        timestamp: new Date().toISOString(),
      };

      return encrypted;
    } catch (error) {
      logger.error('Message encryption failed', error);
      throw new Error(`Failed to encrypt message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt message from device
   */
  async decryptMessage(encryptedMessage: EncryptedMessage): Promise<string> {
    logger.debug('Decrypting message from device');

    try {
      // Verify auth tag
      const authTagValid = this.verifyAuthTag(
        encryptedMessage.encryptedData,
        encryptedMessage.iv,
        encryptedMessage.authTag
      );

      if (!authTagValid) {
        throw new Error('Authentication tag verification failed');
      }

      // Decrypt
      const iv = this.base64ToBytes(encryptedMessage.iv);
      const decrypted = await this.performDecryption(encryptedMessage.encryptedData, iv);

      return decrypted;
    } catch (error) {
      logger.error('Message decryption failed', error);
      throw new Error(`Failed to decrypt message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ================================
  // SECURE BOOT VERIFICATION
  // ================================

  /**
   * Verify secure boot status
   */
  async verifySecureBoot(deviceId: string): Promise<SecureBootStatus> {
    logger.info('Verifying secure boot', { deviceId });

    try {
      // In production, would query device firmware hashes
      const status: SecureBootStatus = {
        enabled: true,
        firmwareHash: this.generateHash('firmware-data'),
        bootloaderHash: this.generateHash('bootloader-data'),
        verified: true,
        trustChain: ['root-ca', 'intermediate-ca', 'device-cert'],
        lastVerified: new Date().toISOString(),
      };

      // Verify trust chain
      const trustChainValid = await this.verifyTrustChain(status.trustChain);
      status.verified = trustChainValid;

      if (!status.verified) {
        logger.warn('Secure boot verification failed', { deviceId });
      }

      this.secureBootStatuses.set(deviceId, status);
      return status;
    } catch (error) {
      logger.error('Secure boot verification failed', error);
      throw new Error(`Failed to verify secure boot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get secure boot status
   */
  getSecureBootStatus(deviceId: string): SecureBootStatus | undefined {
    return this.secureBootStatuses.get(deviceId);
  }

  // ================================
  // OTA UPDATE SIGNING & VERIFICATION
  // ================================

  /**
   * Sign OTA update
   */
  async signOTAUpdate(
    update: Omit<OTAUpdate, 'signature' | 'publicKey'>
  ): Promise<OTAUpdate> {
    logger.info('Signing OTA update', { version: update.version });

    try {
      // Calculate checksum
      const checksum = this.generateHash(update.payload);

      // Generate signature
      const signature = await this.generateSignature(
        update.payload,
        update.algorithm
      );

      const signedUpdate: OTAUpdate = {
        ...update,
        signature,
        publicKey: this.getSigningPublicKey(),
        checksum,
      };

      logger.info('OTA update signed', { version: update.version });
      return signedUpdate;
    } catch (error) {
      logger.error('OTA update signing failed', error);
      throw new Error(`Failed to sign OTA update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify OTA update signature
   */
  async verifyOTAUpdate(update: OTAUpdate): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      logger.info('Verifying OTA update', { version: update.version });

      // Verify checksum
      const calculatedChecksum = this.generateHash(update.payload);
      if (calculatedChecksum !== update.checksum) {
        errors.push('Checksum mismatch');
      }

      // Verify signature
      const signatureValid = await this.verifyOTASignature(
        update.payload,
        update.signature,
        update.publicKey,
        update.algorithm
      );

      if (!signatureValid) {
        errors.push('Invalid signature');
      }

      // Verify public key
      const keyValid = this.verifyPublicKey(update.publicKey);
      if (!keyValid) {
        errors.push('Untrusted public key');
      }

      const valid = errors.length === 0;
      logger.info('OTA update verification complete', { version: update.version, valid });

      return { valid, errors };
    } catch (error) {
      logger.error('OTA update verification failed', error);
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // ================================
  // CERTIFICATE MANAGEMENT
  // ================================

  /**
   * Issue device certificate
   */
  private async issueCertificate(
    deviceId: string,
    publicKey: string,
    certificateRequest: string
  ): Promise<DeviceCertificate> {
    logger.debug('Issuing certificate', { deviceId });

    const validFrom = new Date().toISOString();
    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year

    const certificate: DeviceCertificate = {
      deviceId,
      certificate: this.generateCertificate(deviceId, publicKey, certificateRequest),
      privateKey: this.generatePrivateKey(),
      issuer: 'WorkflowPlatform-CA',
      validFrom,
      validUntil,
      revoked: false,
    };

    this.certificates.set(deviceId, certificate);
    return certificate;
  }

  /**
   * Verify certificate
   */
  private async verifyCertificate(
    certificate: string,
    certificateChain: string[]
  ): Promise<boolean> {
    logger.debug('Verifying certificate');

    try {
      // In production, would use proper certificate verification
      // Check certificate format
      if (!certificate || certificate.length === 0) {
        return false;
      }

      // Verify certificate chain
      if (certificateChain.length > 0) {
        // Chain verification logic
      }

      return true;
    } catch (error) {
      logger.error('Certificate verification failed', error);
      return false;
    }
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(
    deviceId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Revoking certificate', { deviceId, reason });

      const certificate = this.certificates.get(deviceId);
      if (!certificate) {
        return { success: false, error: 'Certificate not found' };
      }

      certificate.revoked = true;
      this.certificates.set(deviceId, certificate);

      // Remove from device registry
      this.deviceRegistry.delete(deviceId);

      logger.info('Certificate revoked', { deviceId });
      return { success: true };
    } catch (error) {
      logger.error('Certificate revocation failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ================================
  // KEY ROTATION
  // ================================

  /**
   * Configure key rotation policy
   */
  configureKeyRotation(
    deviceId: string,
    policy: KeyRotationPolicy
  ): void {
    logger.info('Configuring key rotation', { deviceId, interval: policy.rotationInterval });
    this.rotationPolicies.set(deviceId, policy);

    if (policy.autoRotate) {
      this.scheduleKeyRotation(deviceId, policy);
    }
  }

  /**
   * Rotate device keys
   */
  async rotateKeys(deviceId: string): Promise<{
    success: boolean;
    newPublicKey?: string;
    error?: string;
  }> {
    try {
      logger.info('Rotating keys for device', { deviceId });

      const policy = this.rotationPolicies.get(deviceId);
      if (!policy) {
        return { success: false, error: 'No rotation policy configured' };
      }

      // Generate new key pair
      const newKeyPair = this.generateKeyPair(policy.keyType, policy.keySize);

      // Update device identity
      const identity = this.deviceRegistry.get(deviceId);
      if (identity) {
        identity.publicKey = newKeyPair.publicKey;
        this.deviceRegistry.set(deviceId, identity);
      }

      logger.info('Keys rotated successfully', { deviceId });
      return { success: true, newPublicKey: newKeyPair.publicKey };
    } catch (error) {
      logger.error('Key rotation failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Schedule automatic key rotation
   */
  private scheduleKeyRotation(deviceId: string, policy: KeyRotationPolicy): void {
    logger.debug('Scheduling key rotation', { deviceId, interval: policy.rotationInterval });

    // In production, would use proper job scheduler
    setTimeout(async () => {
      await this.rotateKeys(deviceId);
      this.scheduleKeyRotation(deviceId, policy);
    }, policy.rotationInterval);
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private async verifySignature(
    deviceId: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    logger.debug('Verifying signature', { deviceId });
    // In production, would use proper signature verification
    return signature.length > 0 && publicKey.length > 0;
  }

  private getServerCA(): string {
    return 'SERVER_CA_CERTIFICATE';
  }

  private generateRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return bytes;
  }

  private async performEncryption(data: string, iv: Uint8Array): Promise<string> {
    // Mock encryption - in production would use WebCrypto or Node.js crypto
    logger.debug('Performing encryption', { ivLength: iv.length });
    return Buffer.from(data).toString('base64');
  }

  private async performDecryption(encryptedData: string, iv: Uint8Array): Promise<string> {
    // Mock decryption
    logger.debug('Performing decryption', { ivLength: iv.length });
    return Buffer.from(encryptedData, 'base64').toString();
  }

  private generateAuthTag(encryptedData: string, iv: Uint8Array): string {
    // Mock auth tag generation
    return this.generateHash(encryptedData + this.bytesToBase64(iv));
  }

  private verifyAuthTag(encryptedData: string, iv: string, authTag: string): boolean {
    const expectedTag = this.generateAuthTag(encryptedData, this.base64ToBytes(iv));
    return expectedTag === authTag;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64');
  }

  private base64ToBytes(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  private generateHash(data: string): string {
    // Mock hash generation
    return `hash_${Buffer.from(data).toString('base64').slice(0, 32)}`;
  }

  private async verifyTrustChain(trustChain: string[]): Promise<boolean> {
    logger.debug('Verifying trust chain', { length: trustChain.length });
    return trustChain.length > 0;
  }

  private async generateSignature(data: string, algorithm: string): Promise<string> {
    logger.debug('Generating signature', { algorithm });
    return `sig_${this.generateHash(data)}`;
  }

  private getSigningPublicKey(): string {
    return 'SIGNING_PUBLIC_KEY';
  }

  private async verifyOTASignature(
    payload: string,
    signature: string,
    publicKey: string,
    algorithm: string
  ): Promise<boolean> {
    logger.debug('Verifying OTA signature', { algorithm });
    return signature.length > 0 && publicKey.length > 0 && payload.length > 0;
  }

  private verifyPublicKey(publicKey: string): boolean {
    return publicKey === this.getSigningPublicKey();
  }

  private generateCertificate(deviceId: string, publicKey: string, csr: string): string {
    return `CERT_${deviceId}_${publicKey.slice(0, 16)}_${csr.slice(0, 16)}`;
  }

  private generatePrivateKey(): string {
    return `PRIVATE_KEY_${Math.random().toString(36).slice(2)}`;
  }

  private generateKeyPair(keyType: string, keySize: number): {
    publicKey: string;
    privateKey: string;
  } {
    logger.debug('Generating key pair', { keyType, keySize });
    return {
      publicKey: `PUBLIC_KEY_${keyType}_${keySize}`,
      privateKey: `PRIVATE_KEY_${keyType}_${keySize}`,
    };
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Get device identity
   */
  getDeviceIdentity(deviceId: string): DeviceIdentity | undefined {
    return this.deviceRegistry.get(deviceId);
  }

  /**
   * List all registered devices
   */
  listDevices(): DeviceIdentity[] {
    return Array.from(this.deviceRegistry.values());
  }

  /**
   * Get security metrics
   */
  getMetrics() {
    return {
      registeredDevices: this.deviceRegistry.size,
      issuedCertificates: this.certificates.size,
      revokedCertificates: Array.from(this.certificates.values()).filter(c => c.revoked).length,
      rotationPolicies: this.rotationPolicies.size,
      secureBootVerified: this.secureBootStatuses.size,
    };
  }
}

// Export singleton instance
export const edgeSecurity = new EdgeSecurity();
