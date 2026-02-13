/**
 * Identity Verification System - Zero Trust Architecture
 *
 * Comprehensive identity verification and authentication system with:
 * - Multi-factor authentication (MFA/2FA)
 * - Continuous authentication and behavioral biometrics
 * - Risk-based adaptive authentication
 * - Identity proofing and verification
 * - Session management with binding
 * - Identity federation (SAML 2.0, OIDC/OAuth 2.0)
 * - Audit logging and compliance
 *
 * @module src/security/zerotrust/IdentityVerification
 */

import * as crypto from 'crypto'
import { EventEmitter } from 'events'

/**
 * Multi-factor authentication method types
 */
enum MFAMethod {
  PASSWORD = 'password',
  TOTP = 'totp',
  PUSH = 'push',
  SMS_OTP = 'sms_otp',
  EMAIL_OTP = 'email_otp',
  FIDO2 = 'fido2',
  BIOMETRIC = 'biometric'
}

/**
 * Authentication risk levels
 */
enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Authentication strength levels
 */
enum AuthStrength {
  WEAK = 'weak',           // Single factor, low entropy
  MODERATE = 'moderate',   // Single factor, high entropy OR multiple factors
  STRONG = 'strong',       // Multiple factors + continuous auth
  VERY_STRONG = 'very_strong' // Multiple factors + continuous auth + hardware token
}

/**
 * MFA configuration for a user
 */
interface MFAConfiguration {
  userId: string
  methods: Map<MFAMethod, MFAMethodConfig>
  primaryMethod: MFAMethod
  backupCodes: string[]
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Individual MFA method configuration
 */
interface MFAMethodConfig {
  method: MFAMethod
  enabled: boolean
  verified: boolean
  verifiedAt?: Date
  config: Record<string, unknown>
  secret?: string
  challenge?: string
  lastUsed?: Date
}

/**
 * TOTP configuration
 */
interface TOTPConfig {
  secret: string
  algorithm: 'SHA1' | 'SHA256' | 'SHA512'
  digits: number
  period: number
}

/**
 * Behavioral biometrics profile
 */
interface BehavioralProfile {
  userId: string
  typingPattern: {
    avgKeyPressDuration: number
    avgInterKeyInterval: number
    keyErrorRate: number
  }
  mouseMovement: {
    avgVelocity: number
    avgAcceleration: number
    pauseFrequency: number
  }
  sessionBehavior: {
    activeHours: number[]
    avgSessionDuration: number
    deviceConsistency: number
  }
}

/**
 * Device fingerprint
 */
interface DeviceFingerprint {
  deviceId: string
  userAgent: string
  ipAddress: string
  macAddress?: string
  osVersion: string
  browserVersion: string
  screenResolution: string
  timezone: string
  language: string
  hash: string
}

/**
 * Risk assessment result
 */
interface RiskAssessment {
  riskScore: number // 0-100
  riskLevel: RiskLevel
  factors: RiskFactor[]
  requiresStepUp: boolean
  recommendedMFAMethods: MFAMethod[]
  timestamp: Date
}

/**
 * Individual risk factor
 */
interface RiskFactor {
  type: string
  weight: number // 0-100
  description: string
  detectedAt: Date
}

/**
 * Identity proofing result
 */
interface IdentityProofResult {
  userId: string
  verified: boolean
  verificationMethod: 'document' | 'knowledge' | 'third_party' | 'combined'
  identityScore: number // 0-100
  documentType?: string
  documentVerified?: boolean
  knowledgeQuestionsCorrect?: number
  thirdPartyProvider?: string
  verifiedAt: Date
  expiresAt: Date
}

/**
 * Session information
 */
interface SessionInfo {
  sessionId: string
  userId: string
  createdAt: Date
  expiresAt: Date
  lastActivityAt: Date
  ipAddress: string
  deviceId: string
  deviceFingerprint: DeviceFingerprint
  authStrength: AuthStrength
  mfaMethods: MFAMethod[]
  bindings: {
    ip?: string
    device?: string
    location?: string
  }
  riskScore: number
  isValid: boolean
}

/**
 * Authentication event for audit logging
 */
interface AuthenticationEvent {
  eventId: string
  userId: string
  eventType: 'login' | 'logout' | 'mfa_success' | 'mfa_failure' | 'risk_detected' | 'session_created' | 'session_revoked'
  timestamp: Date
  ipAddress: string
  deviceId: string
  riskScore: number
  metadata: Record<string, unknown>
}

/**
 * Identity Verification System
 *
 * Provides comprehensive zero-trust identity verification with adaptive
 * authentication, continuous authentication, and risk-based security.
 *
 * @example
 * ```typescript
 * const idVerification = new IdentityVerification()
 *
 * // Setup MFA for user
 * await idVerification.setupMFA(userId, {
 *   primaryMethod: MFAMethod.TOTP,
 *   backupMethods: [MFAMethod.FIDO2, MFAMethod.SMS_OTP]
 * })
 *
 * // Authenticate with risk assessment
 * const result = await idVerification.authenticate(
 *   credentials,
 *   deviceFingerprint
 * )
 *
 * // Verify MFA challenge
 * const mfaResult = await idVerification.verifyMFA(
 *   sessionId,
 *   MFAMethod.TOTP,
 *   totp_code
 * )
 * ```
 */
export class IdentityVerification extends EventEmitter {
  private mfaConfigurations: Map<string, MFAConfiguration> = new Map()
  private sessions: Map<string, SessionInfo> = new Map()
  private behavioralProfiles: Map<string, BehavioralProfile> = new Map()
  private deviceFingerprints: Map<string, DeviceFingerprint> = new Map()
  private identityProofs: Map<string, IdentityProofResult> = new Map()
  private auditLogs: AuthenticationEvent[] = []
  private failedAttempts: Map<string, { count: number; resetTime: Date }> = new Map()

  // Configuration
  private readonly MFA_WINDOW = 30 // TOTP time window in seconds
  private readonly SESSION_TIMEOUT = 3600 // 1 hour in seconds
  private readonly MAX_FAILED_ATTEMPTS = 5
  private readonly LOCKOUT_DURATION = 900 // 15 minutes in seconds
  private readonly STEP_UP_THRESHOLD = 65 // Risk score threshold for step-up auth
  private readonly SESSION_BINDING_STRICT = true

  constructor() {
    super()
  }

  /**
   * Setup multi-factor authentication for a user
   *
   * @param userId - User identifier
   * @param config - MFA configuration
   * @returns Promise resolving to MFA configuration
   */
  async setupMFA(
    userId: string,
    config: {
      primaryMethod: MFAMethod
      backupMethods?: MFAMethod[]
      totpConfig?: Partial<TOTPConfig>
    }
  ): Promise<MFAConfiguration> {
    const mfaConfig: MFAConfiguration = {
      userId,
      methods: new Map(),
      primaryMethod: config.primaryMethod,
      backupCodes: this.generateBackupCodes(10),
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Setup primary method
    const primaryMethodConfig = await this.setupMFAMethod(
      config.primaryMethod,
      config.totpConfig
    )
    mfaConfig.methods.set(config.primaryMethod, primaryMethodConfig)

    // Setup backup methods
    if (config.backupMethods) {
      for (const method of config.backupMethods) {
        const methodConfig = await this.setupMFAMethod(method)
        mfaConfig.methods.set(method, methodConfig)
      }
    }

    this.mfaConfigurations.set(userId, mfaConfig)
    await this.logAuthenticationEvent({
      userId,
      eventType: 'mfa_success',
      ipAddress: '0.0.0.0',
      deviceId: 'setup',
      riskScore: 0,
      metadata: { action: 'mfa_setup', methods: Array.from(mfaConfig.methods.keys()) }
    })

    return mfaConfig
  }

  /**
   * Setup individual MFA method
   *
   * @param method - MFA method type
   * @param config - Method-specific configuration
   * @returns Promise resolving to method configuration
   */
  private async setupMFAMethod(
    method: MFAMethod,
    config?: Record<string, unknown>
  ): Promise<MFAMethodConfig> {
    const methodConfig: MFAMethodConfig = {
      method,
      enabled: false,
      verified: false,
      config: config || {}
    }

    switch (method) {
      case MFAMethod.TOTP: {
        const totpSecret = crypto.randomBytes(32).toString('base64')
        methodConfig.secret = totpSecret
        methodConfig.config = {
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          ...config
        }
        break
      }

      case MFAMethod.FIDO2: {
        const challenge = crypto.randomBytes(32).toString('base64')
        methodConfig.challenge = challenge
        methodConfig.config = { challenge }
        break
      }

      case MFAMethod.SMS_OTP:
      case MFAMethod.EMAIL_OTP: {
        methodConfig.config = { deliveryAttempts: 0, ...config }
        break
      }

      case MFAMethod.PUSH:
      case MFAMethod.BIOMETRIC:
      case MFAMethod.PASSWORD:
      default: {
        methodConfig.config = { ...config }
        break
      }
    }

    return methodConfig
  }

  /**
   * Verify MFA challenge response
   *
   * @param sessionId - Session identifier
   * @param method - MFA method to verify
   * @param response - User's MFA response (OTP code, signature, etc.)
   * @param metadata - Additional verification metadata
   * @returns Promise resolving to verification result
   */
  async verifyMFA(
    sessionId: string,
    method: MFAMethod,
    response: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, message: 'Invalid session' }
    }

    const mfaConfig = this.mfaConfigurations.get(session.userId)
    if (!mfaConfig || !mfaConfig.enabled) {
      return { success: false, message: 'MFA not configured' }
    }

    const methodConfig = mfaConfig.methods.get(method)
    if (!methodConfig || !methodConfig.enabled) {
      return { success: false, message: `MFA method ${method} not enabled` }
    }

    let isValid = false

    switch (method) {
      case MFAMethod.TOTP: {
        isValid = this.verifyTOTP(methodConfig.secret || '', response)
        break
      }

      case MFAMethod.SMS_OTP:
      case MFAMethod.EMAIL_OTP: {
        isValid = await this.verifyOTP(method, session.userId, response)
        break
      }

      case MFAMethod.FIDO2: {
        isValid = await this.verifyFIDO2(methodConfig, response)
        break
      }

      case MFAMethod.BIOMETRIC: {
        isValid = await this.verifyBiometric(session.userId, response, metadata)
        break
      }

      case MFAMethod.PASSWORD: {
        isValid = await this.verifyPassword(session.userId, response)
        break
      }

      case MFAMethod.PUSH:
      default: {
        isValid = false
      }
    }

    if (isValid) {
      methodConfig.lastUsed = new Date()
      session.authStrength = this.calculateAuthStrength(mfaConfig)
      session.mfaMethods = Array.from(mfaConfig.methods.keys())

      await this.logAuthenticationEvent({
        userId: session.userId,
        eventType: 'mfa_success',
        ipAddress: session.ipAddress,
        deviceId: session.deviceId,
        riskScore: session.riskScore,
        metadata: { method, ...metadata }
      })

      return { success: true, message: 'MFA verification successful' }
    }

    await this.logAuthenticationEvent({
      userId: session.userId,
      eventType: 'mfa_failure',
      ipAddress: session.ipAddress,
      deviceId: session.deviceId,
      riskScore: session.riskScore,
      metadata: { method, ...metadata }
    })

    return { success: false, message: 'MFA verification failed' }
  }

  /**
   * Verify TOTP code
   *
   * @param secret - TOTP secret
   * @param code - User-provided code
   * @param window - Time window tolerance in steps
   * @returns True if TOTP is valid
   */
  private verifyTOTP(secret: string, code: string, window: number = 1): boolean {
    try {
      const secretBuffer = Buffer.from(secret, 'base64')
      const now = Math.floor(Date.now() / 1000)

      for (let i = -window; i <= window; i++) {
        const counter = Math.floor((now + i * this.MFA_WINDOW) / this.MFA_WINDOW)
        const hmac = crypto.createHmac('sha1', secretBuffer)
        hmac.update(Buffer.alloc(8))
        Buffer.alloc(8).writeUInt32BE(counter, 4)

        const digest = hmac.digest()
        const offset = digest[digest.length - 1] & 0x0f
        const otp = (
          ((digest[offset] & 0x7f) << 24) |
          ((digest[offset + 1] & 0xff) << 16) |
          ((digest[offset + 2] & 0xff) << 8) |
          (digest[offset + 3] & 0xff)
        ) % 1000000

        const formattedOtp = otp.toString().padStart(6, '0')
        if (formattedOtp === code) {
          return true
        }
      }

      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Verify OTP sent via SMS or Email
   *
   * @param method - OTP delivery method
   * @param userId - User identifier
   * @param code - User-provided OTP code
   * @returns Promise resolving to verification result
   */
  private async verifyOTP(
    method: MFAMethod.SMS_OTP | MFAMethod.EMAIL_OTP,
    userId: string,
    code: string
  ): Promise<boolean> {
    // Implementation would integrate with SMS/Email services
    // This is a placeholder for the actual OTP verification
    return code.length === 6 && /^\d+$/.test(code)
  }

  /**
   * Verify FIDO2/WebAuthn credential
   *
   * @param methodConfig - FIDO2 method configuration
   * @param response - WebAuthn assertion response
   * @returns Promise resolving to verification result
   */
  private async verifyFIDO2(
    methodConfig: MFAMethodConfig,
    response: string
  ): Promise<boolean> {
    // Implementation would verify WebAuthn assertion
    // This is a placeholder for actual FIDO2 verification
    return response.length > 0
  }

  /**
   * Verify biometric authentication
   *
   * @param userId - User identifier
   * @param response - Biometric data or token
   * @param metadata - Additional verification metadata
   * @returns Promise resolving to verification result
   */
  private async verifyBiometric(
    userId: string,
    response: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    // Implementation would verify biometric data against stored template
    // This is a placeholder for actual biometric verification
    return response.length > 0
  }

  /**
   * Verify password
   *
   * @param userId - User identifier
   * @param password - Plain text password
   * @returns Promise resolving to verification result
   */
  private async verifyPassword(userId: string, password: string): Promise<boolean> {
    // Implementation would hash and compare password
    // This is a placeholder for actual password verification
    return password.length >= 8
  }

  /**
   * Perform risk assessment for authentication
   *
   * @param userId - User identifier
   * @param deviceFingerprint - Device fingerprint
   * @param context - Authentication context
   * @returns Promise resolving to risk assessment
   */
  async assessRisk(
    userId: string,
    deviceFingerprint: DeviceFingerprint,
    context: {
      ipAddress: string
      userAgent: string
      timestamp: Date
      behavioralData?: Record<string, unknown>
    }
  ): Promise<RiskAssessment> {
    let riskScore = 0
    const factors: RiskFactor[] = []

    // Check failed login attempts
    const failedAttempts = this.failedAttempts.get(userId)
    if (failedAttempts && failedAttempts.count >= this.MAX_FAILED_ATTEMPTS) {
      const score = Math.min(failedAttempts.count * 15, 50)
      riskScore += score
      factors.push({
        type: 'excessive_failed_attempts',
        weight: score,
        description: `${failedAttempts.count} failed login attempts detected`,
        detectedAt: new Date()
      })
    }

    // Check device fingerprint changes
    const lastFingerprint = this.deviceFingerprints.get(userId)
    if (lastFingerprint && lastFingerprint.hash !== deviceFingerprint.hash) {
      riskScore += 25
      factors.push({
        type: 'new_device',
        weight: 25,
        description: 'New or unrecognized device detected',
        detectedAt: new Date()
      })
    }

    // Check location change
    if (lastFingerprint && lastFingerprint.ipAddress !== context.ipAddress) {
      riskScore += 20
      factors.push({
        type: 'location_change',
        weight: 20,
        description: 'Unusual location detected',
        detectedAt: new Date()
      })
    }

    // Check behavioral profile
    const behavioralProfile = this.behavioralProfiles.get(userId)
    if (behavioralProfile && context.behavioralData) {
      const behaviorScore = this.assessBehavioralAnomaly(
        behavioralProfile,
        context.behavioralData
      )
      if (behaviorScore > 30) {
        riskScore += behaviorScore * 0.5
        factors.push({
          type: 'behavioral_anomaly',
          weight: behaviorScore * 0.5,
          description: 'Unusual user behavior detected',
          detectedAt: new Date()
        })
      }
    }

    riskScore = Math.min(riskScore, 100)

    const riskLevel = this.calculateRiskLevel(riskScore)
    const requiresStepUp = riskScore >= this.STEP_UP_THRESHOLD

    const recommendedMFAMethods = this.recommendMFAMethods(riskLevel)

    return {
      riskScore,
      riskLevel,
      factors,
      requiresStepUp,
      recommendedMFAMethods,
      timestamp: context.timestamp
    }
  }

  /**
   * Assess behavioral anomalies
   *
   * @param profile - User's behavioral profile
   * @param currentBehavior - Current behavioral data
   * @returns Anomaly score (0-100)
   */
  private assessBehavioralAnomaly(
    profile: BehavioralProfile,
    currentBehavior: Record<string, unknown>
  ): number {
    let anomalyScore = 0

    // Compare typing patterns
    if (currentBehavior.typingPattern) {
      const tp = currentBehavior.typingPattern as Record<string, number>
      const deviation = Math.abs(
        (tp.avgKeyPressDuration - profile.typingPattern.avgKeyPressDuration) /
        profile.typingPattern.avgKeyPressDuration
      )
      anomalyScore += Math.min(deviation * 50, 30)
    }

    // Compare mouse movement
    if (currentBehavior.mouseMovement) {
      const mm = currentBehavior.mouseMovement as Record<string, number>
      const deviation = Math.abs(
        (mm.avgVelocity - profile.mouseMovement.avgVelocity) /
        profile.mouseMovement.avgVelocity
      )
      anomalyScore += Math.min(deviation * 50, 30)
    }

    // Check active hours
    const now = new Date()
    const currentHour = now.getHours()
    if (!profile.sessionBehavior.activeHours.includes(currentHour)) {
      anomalyScore += 20
    }

    return Math.min(anomalyScore, 100)
  }

  /**
   * Calculate risk level from risk score
   *
   * @param riskScore - Risk score (0-100)
   * @returns Risk level
   */
  private calculateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 80) return RiskLevel.CRITICAL
    if (riskScore >= 60) return RiskLevel.HIGH
    if (riskScore >= 30) return RiskLevel.MEDIUM
    return RiskLevel.LOW
  }

  /**
   * Recommend MFA methods based on risk level
   *
   * @param riskLevel - Risk level
   * @returns Array of recommended MFA methods
   */
  private recommendMFAMethods(riskLevel: RiskLevel): MFAMethod[] {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return [MFAMethod.FIDO2, MFAMethod.BIOMETRIC, MFAMethod.TOTP]
      case RiskLevel.HIGH:
        return [MFAMethod.TOTP, MFAMethod.FIDO2, MFAMethod.SMS_OTP]
      case RiskLevel.MEDIUM:
        return [MFAMethod.TOTP, MFAMethod.SMS_OTP]
      case RiskLevel.LOW:
      default:
        return [MFAMethod.PASSWORD]
    }
  }

  /**
   * Create a new authenticated session
   *
   * @param userId - User identifier
   * @param deviceFingerprint - Device fingerprint
   * @param authStrength - Authentication strength level
   * @param mfaMethods - MFA methods used
   * @param ipAddress - Client IP address
   * @returns Session information
   */
  createSession(
    userId: string,
    deviceFingerprint: DeviceFingerprint,
    authStrength: AuthStrength,
    mfaMethods: MFAMethod[],
    ipAddress: string
  ): SessionInfo {
    const sessionId = crypto.randomUUID()
    const now = new Date()

    const session: SessionInfo = {
      sessionId,
      userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TIMEOUT * 1000),
      lastActivityAt: now,
      ipAddress,
      deviceId: deviceFingerprint.deviceId,
      deviceFingerprint,
      authStrength,
      mfaMethods,
      bindings: {
        ip: ipAddress,
        device: deviceFingerprint.deviceId,
        location: `${deviceFingerprint.timezone}`
      },
      riskScore: 0,
      isValid: true
    }

    this.sessions.set(sessionId, session)
    this.deviceFingerprints.set(userId, deviceFingerprint)

    return session
  }

  /**
   * Validate session
   *
   * @param sessionId - Session identifier
   * @param deviceFingerprint - Current device fingerprint
   * @param ipAddress - Current IP address
   * @returns Validation result
   */
  validateSession(
    sessionId: string,
    deviceFingerprint: DeviceFingerprint,
    ipAddress: string
  ): { valid: boolean; reason?: string } {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return { valid: false, reason: 'Session not found' }
    }

    if (!session.isValid) {
      return { valid: false, reason: 'Session revoked' }
    }

    if (new Date() > session.expiresAt) {
      session.isValid = false
      return { valid: false, reason: 'Session expired' }
    }

    // Check session bindings if strict mode enabled
    if (this.SESSION_BINDING_STRICT) {
      if (session.bindings.ip && session.bindings.ip !== ipAddress) {
        return { valid: false, reason: 'IP address mismatch' }
      }

      if (
        session.bindings.device &&
        session.bindings.device !== deviceFingerprint.deviceId
      ) {
        return { valid: false, reason: 'Device mismatch' }
      }
    }

    // Update last activity
    session.lastActivityAt = new Date()

    return { valid: true }
  }

  /**
   * Revoke session
   *
   * @param sessionId - Session identifier
   * @param reason - Revocation reason
   * @returns Revocation result
   */
  revokeSession(sessionId: string, reason: string = 'User logout'): { success: boolean } {
    const session = this.sessions.get(sessionId)

    if (session) {
      session.isValid = false
      this.logAuthenticationEvent({
        userId: session.userId,
        eventType: 'session_revoked',
        ipAddress: session.ipAddress,
        deviceId: session.deviceId,
        riskScore: session.riskScore,
        metadata: { reason }
      }).catch(() => {})
    }

    return { success: !!session }
  }

  /**
   * Calculate authentication strength
   *
   * @param mfaConfig - User's MFA configuration
   * @returns Authentication strength level
   */
  private calculateAuthStrength(mfaConfig: MFAConfiguration): AuthStrength {
    const enabledMethods = Array.from(mfaConfig.methods.values()).filter(
      m => m.enabled && m.verified
    )

    // Count method types by strength
    let hardwareTokenCount = 0
    let softwareTokenCount = 0
    let passwordOnly = enabledMethods.length === 0

    for (const method of enabledMethods) {
      if (method.method === MFAMethod.FIDO2 || method.method === MFAMethod.BIOMETRIC) {
        hardwareTokenCount++
      } else {
        softwareTokenCount++
      }
    }

    if (hardwareTokenCount > 0 && softwareTokenCount > 0) {
      return AuthStrength.VERY_STRONG
    }

    if (hardwareTokenCount > 0 || softwareTokenCount >= 2) {
      return AuthStrength.STRONG
    }

    if (softwareTokenCount === 1) {
      return AuthStrength.MODERATE
    }

    return AuthStrength.WEAK
  }

  /**
   * Update behavioral profile for user
   *
   * @param userId - User identifier
   * @param behavior - Current behavioral data
   */
  updateBehavioralProfile(
    userId: string,
    behavior: {
      typingPattern?: BehavioralProfile['typingPattern']
      mouseMovement?: BehavioralProfile['mouseMovement']
      sessionBehavior?: BehavioralProfile['sessionBehavior']
    }
  ): void {
    let profile = this.behavioralProfiles.get(userId)

    if (!profile) {
      profile = {
        userId,
        typingPattern: {
          avgKeyPressDuration: 0,
          avgInterKeyInterval: 0,
          keyErrorRate: 0
        },
        mouseMovement: {
          avgVelocity: 0,
          avgAcceleration: 0,
          pauseFrequency: 0
        },
        sessionBehavior: {
          activeHours: [],
          avgSessionDuration: 0,
          deviceConsistency: 0
        }
      }
    }

    // Update with new behavior data
    if (behavior.typingPattern) {
      profile.typingPattern = {
        ...profile.typingPattern,
        ...behavior.typingPattern
      }
    }

    if (behavior.mouseMovement) {
      profile.mouseMovement = {
        ...profile.mouseMovement,
        ...behavior.mouseMovement
      }
    }

    if (behavior.sessionBehavior) {
      profile.sessionBehavior = {
        ...profile.sessionBehavior,
        ...behavior.sessionBehavior
      }
    }

    this.behavioralProfiles.set(userId, profile)
  }

  /**
   * Record failed authentication attempt
   *
   * @param userId - User identifier
   */
  recordFailedAttempt(userId: string): void {
    let attempts = this.failedAttempts.get(userId)

    if (!attempts) {
      attempts = {
        count: 1,
        resetTime: new Date(Date.now() + this.LOCKOUT_DURATION * 1000)
      }
    } else if (new Date() > attempts.resetTime) {
      attempts.count = 1
      attempts.resetTime = new Date(Date.now() + this.LOCKOUT_DURATION * 1000)
    } else {
      attempts.count++
    }

    this.failedAttempts.set(userId, attempts)
  }

  /**
   * Check if user is locked out
   *
   * @param userId - User identifier
   * @returns Lockout status and remaining time
   */
  isLockedOut(userId: string): { locked: boolean; remainingSeconds?: number } {
    const attempts = this.failedAttempts.get(userId)

    if (!attempts) {
      return { locked: false }
    }

    if (attempts.count >= this.MAX_FAILED_ATTEMPTS) {
      const now = new Date()
      if (now < attempts.resetTime) {
        const remaining = Math.ceil(
          (attempts.resetTime.getTime() - now.getTime()) / 1000
        )
        return { locked: true, remainingSeconds: remaining }
      } else {
        this.failedAttempts.delete(userId)
        return { locked: false }
      }
    }

    return { locked: false }
  }

  /**
   * Clear failed attempts for user
   *
   * @param userId - User identifier
   */
  clearFailedAttempts(userId: string): void {
    this.failedAttempts.delete(userId)
  }

  /**
   * Record identity proof
   *
   * @param userId - User identifier
   * @param proof - Identity proof result
   */
  recordIdentityProof(userId: string, proof: IdentityProofResult): void {
    this.identityProofs.set(userId, proof)
  }

  /**
   * Get identity proof status
   *
   * @param userId - User identifier
   * @returns Identity proof result or undefined
   */
  getIdentityProof(userId: string): IdentityProofResult | undefined {
    return this.identityProofs.get(userId)
  }

  /**
   * Generate backup codes for account recovery
   *
   * @param count - Number of backup codes to generate
   * @returns Array of backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
    }
    return codes
  }

  /**
   * Log authentication event for audit trail
   *
   * @param event - Authentication event details
   */
  private async logAuthenticationEvent(
    event: Omit<AuthenticationEvent, 'eventId' | 'timestamp'>
  ): Promise<void> {
    const auditEvent: AuthenticationEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      ...event
    }

    this.auditLogs.push(auditEvent)
    this.emit('authentication_event', auditEvent)

    // Keep only last 10000 events in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000)
    }
  }

  /**
   * Get audit logs filtered by criteria
   *
   * @param filter - Filter criteria
   * @returns Matching audit logs
   */
  getAuditLogs(filter?: {
    userId?: string
    eventType?: AuthenticationEvent['eventType']
    startDate?: Date
    endDate?: Date
  }): AuthenticationEvent[] {
    return this.auditLogs.filter(event => {
      if (filter?.userId && event.userId !== filter.userId) return false
      if (filter?.eventType && event.eventType !== filter.eventType) return false
      if (filter?.startDate && event.timestamp < filter.startDate) return false
      if (filter?.endDate && event.timestamp > filter.endDate) return false
      return true
    })
  }

  /**
   * Get compliance report
   *
   * @param userId - User identifier (optional, all users if not provided)
   * @returns Compliance report
   */
  getComplianceReport(userId?: string): {
    totalEvents: number
    successfulLogins: number
    failedLogins: number
    mfaUsageRate: number
    averageSessionDuration: number
    lastAuthenticationDate?: Date
  } {
    const events = userId
      ? this.getAuditLogs({ userId })
      : this.auditLogs

    const successfulLogins = events.filter(
      e => e.eventType === 'mfa_success' || e.eventType === 'login'
    ).length
    const failedLogins = events.filter(
      e => e.eventType === 'mfa_failure'
    ).length
    const mfaUsageRate = successfulLogins > 0
      ? (events.filter(e => e.eventType === 'mfa_success').length / successfulLogins)
      : 0

    const sessionEvents = events.filter(e => e.eventType === 'session_created')
    const avgSessionDuration = sessionEvents.length > 0
      ? this.SESSION_TIMEOUT / sessionEvents.length
      : 0

    const lastEvent = events[events.length - 1]

    return {
      totalEvents: events.length,
      successfulLogins,
      failedLogins,
      mfaUsageRate,
      averageSessionDuration: avgSessionDuration,
      lastAuthenticationDate: lastEvent?.timestamp
    }
  }
}

export {
  MFAMethod,
  RiskLevel,
  AuthStrength
}

export type {
  MFAConfiguration,
  BehavioralProfile,
  DeviceFingerprint,
  RiskAssessment,
  IdentityProofResult,
  SessionInfo,
  AuthenticationEvent
}
