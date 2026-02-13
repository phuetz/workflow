/**
 * Workflow Mobile App - React Native
 * Cross-platform mobile application for workflow automation
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store } from './src/store/store';
import { AuthProvider } from './src/contexts/AuthContext';
import { WebSocketProvider } from './src/contexts/WebSocketContext';
import { OfflineProvider } from './src/contexts/OfflineContext';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WorkflowListScreen from './src/screens/WorkflowListScreen';
import WorkflowEditorScreen from './src/screens/WorkflowEditorScreen';
import ExecutionsScreen from './src/screens/ExecutionsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Components
import TabBarIcon from './src/components/TabBarIcon';
import HeaderRight from './src/components/HeaderRight';
import { colors } from './src/theme/colors';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Configure push notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Workflows"
        component={WorkflowListScreen}
        options={{
          tabBarLabel: 'Workflows',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="workflow" color={color} size={size} />
          ),
          tabBarBadge: 3, // Number of active workflows
        }}
      />
      <Tab.Screen
        name="Executions"
        component={ExecutionsScreen}
        options={{
          tabBarLabel: 'Executions',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="play" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="notifications" color={color} size={size} />
          ),
          tabBarBadge: 5, // Unread notifications
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="person" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    checkAuthStatus();
    
    // Request notification permissions
    requestNotificationPermissions();
    
    // Setup biometric authentication
    setupBiometricAuth();
  }, []);

  const checkAuthStatus = async () => {
    // Check if user is already authenticated
    // This would check secure storage for auth tokens
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
    }
  };

  const setupBiometricAuth = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    console.log('Biometric hardware:', hasHardware);
    console.log('Supported types:', supportedTypes);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Provider store={store}>
      <AuthProvider>
        <WebSocketProvider>
          <OfflineProvider>
            <SafeAreaProvider>
              <NavigationContainer>
                <StatusBar style="auto" />
                <Stack.Navigator
                  screenOptions={{
                    headerStyle: {
                      backgroundColor: colors.primary,
                    },
                    headerTintColor: colors.white,
                    headerTitleStyle: {
                      fontWeight: 'bold',
                    },
                  }}
                >
                  {!isAuthenticated ? (
                    <>
                      <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                      />
                    </>
                  ) : (
                    <>
                      <Stack.Screen
                        name="Main"
                        component={TabNavigator}
                        options={{
                          headerTitle: 'Workflow Platform',
                          headerRight: () => <HeaderRight />,
                        }}
                      />
                      <Stack.Screen
                        name="WorkflowEditor"
                        component={WorkflowEditorScreen}
                        options={{
                          headerTitle: 'Edit Workflow',
                        }}
                      />
                      <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{
                          headerTitle: 'Settings',
                        }}
                      />
                    </>
                  )}
                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaProvider>
          </OfflineProvider>
        </WebSocketProvider>
      </AuthProvider>
    </Provider>
  );
}