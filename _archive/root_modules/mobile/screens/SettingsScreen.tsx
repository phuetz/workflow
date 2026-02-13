import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import BiometricAuth from '../services/BiometricAuth';
import NotificationService from '../services/NotificationService';
import SyncService from '../services/SyncService';
import WorkflowService from '../services/WorkflowService';

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, logout, auth, syncQueueLength } = useAppStore();
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = BiometricAuth.isAvailable();
    setBiometricAvailable(available);
    if (available) {
      setBiometricType(BiometricAuth.getBiometricTypeName());
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await BiometricAuth.authenticate(
        `Enable ${biometricType} authentication`
      );
      if (success) {
        await BiometricAuth.setEnabled(true);
        updateSettings({ biometricAuth: true });
      } else {
        Alert.alert('Authentication Failed', 'Could not enable biometric authentication');
      }
    } else {
      await BiometricAuth.setEnabled(false);
      updateSettings({ biometricAuth: false });
    }
  };

  const handleThemeChange = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(settings.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    updateSettings({ theme: nextTheme });
  };

  const handleSyncNow = async () => {
    try {
      await SyncService.processQueue();
      Alert.alert('Success', 'Sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', 'Failed to sync data');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await WorkflowService.clearCache();
            Alert.alert('Success', 'Cache cleared');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Logged Out', 'You have been logged out successfully');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const SettingsRow = ({
    label,
    value,
    onPress,
    showChevron = true,
  }: {
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.settingsLabel}>{label}</Text>
      <View style={styles.settingsRight}>
        {value && <Text style={styles.settingsValue}>{value}</Text>}
        {showChevron && onPress && <Text style={styles.chevron}>›</Text>}
      </View>
    </TouchableOpacity>
  );

  const SettingsSwitchRow = ({
    label,
    value,
    onValueChange,
    disabled,
  }: {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={styles.settingsRow}>
      <Text style={[styles.settingsLabel, disabled && styles.disabledText]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#ccc', true: '#6366f1' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
        disabled={disabled}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* User Info */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{auth.user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.userName}>{auth.user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{auth.user?.email || 'user@example.com'}</Text>
      </View>

      {/* Appearance */}
      <SettingsSection title="Appearance">
        <SettingsRow
          label="Theme"
          value={settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}
          onPress={handleThemeChange}
        />
      </SettingsSection>

      {/* Security */}
      <SettingsSection title="Security">
        <SettingsSwitchRow
          label={`${biometricType} Authentication`}
          value={settings.biometricAuth}
          onValueChange={handleBiometricToggle}
          disabled={!biometricAvailable}
        />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title="Notifications">
        <SettingsSwitchRow
          label="Enable Notifications"
          value={settings.notifications.enabled}
          onValueChange={(enabled) =>
            updateSettings({
              notifications: { ...settings.notifications, enabled },
            })
          }
        />
        <SettingsSwitchRow
          label="Execution Completed"
          value={settings.notifications.executionComplete}
          onValueChange={(executionComplete) =>
            updateSettings({
              notifications: { ...settings.notifications, executionComplete },
            })
          }
          disabled={!settings.notifications.enabled}
        />
        <SettingsSwitchRow
          label="Execution Failed"
          value={settings.notifications.executionFailed}
          onValueChange={(executionFailed) =>
            updateSettings({
              notifications: { ...settings.notifications, executionFailed },
            })
          }
          disabled={!settings.notifications.enabled}
        />
        <SettingsSwitchRow
          label="Workflow Updated"
          value={settings.notifications.workflowUpdated}
          onValueChange={(workflowUpdated) =>
            updateSettings({
              notifications: { ...settings.notifications, workflowUpdated },
            })
          }
          disabled={!settings.notifications.enabled}
        />
      </SettingsSection>

      {/* Sync */}
      <SettingsSection title="Sync & Storage">
        <SettingsSwitchRow
          label="Offline Mode"
          value={settings.offlineMode}
          onValueChange={(offlineMode) => updateSettings({ offlineMode })}
        />
        <SettingsRow
          label="Sync Now"
          value={syncQueueLength > 0 ? `${syncQueueLength} pending` : 'Up to date'}
          onPress={handleSyncNow}
        />
        <SettingsRow label="Clear Cache" onPress={handleClearCache} />
      </SettingsSection>

      {/* About */}
      <SettingsSection title="About">
        <SettingsRow label="Version" value="1.0.0" showChevron={false} />
        <SettingsRow label="Privacy Policy" onPress={() => console.log('Privacy')} />
        <SettingsRow label="Terms of Service" onPress={() => console.log('Terms')} />
      </SettingsSection>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  userCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 24,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginLeft: 20,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#fff',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingsLabel: {
    fontSize: 16,
    color: '#1f2937',
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsValue: {
    fontSize: 16,
    color: '#6b7280',
    marginRight: 8,
  },
  chevron: {
    fontSize: 24,
    color: '#d1d5db',
  },
  disabledText: {
    color: '#9ca3af',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
