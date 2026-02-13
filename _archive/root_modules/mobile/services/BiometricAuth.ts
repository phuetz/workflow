import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

export interface BiometricCapabilities {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  hasHardware: boolean;
}

class BiometricAuthService {
  private capabilities: BiometricCapabilities | null = null;

  async initialize() {
    this.capabilities = await this.checkCapabilities();
  }

  async checkCapabilities(): Promise<BiometricCapabilities> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    const supportedTypes = hasHardware
      ? await LocalAuthentication.supportedAuthenticationTypesAsync()
      : [];

    return {
      isAvailable: hasHardware && isEnrolled,
      isEnrolled,
      supportedTypes,
      hasHardware,
    };
  }

  async authenticate(reason?: string): Promise<boolean> {
    if (!this.capabilities?.isAvailable) {
      console.log('Biometric authentication not available');
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Authenticate to continue',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  getBiometricTypeName(): string {
    if (!this.capabilities) {
      return 'Biometric';
    }

    const { supportedTypes } = this.capabilities;

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }

    return 'Biometric';
  }

  async isEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
    } catch (error) {
      console.error('Error setting biometric enabled status:', error);
    }
  }

  async authenticateIfEnabled(reason?: string): Promise<boolean> {
    const enabled = await this.isEnabled();

    if (!enabled) {
      return true; // Not enabled, so consider it as authenticated
    }

    return this.authenticate(reason);
  }

  getCapabilities(): BiometricCapabilities | null {
    return this.capabilities;
  }

  isAvailable(): boolean {
    return this.capabilities?.isAvailable || false;
  }
}

export default new BiometricAuthService();
