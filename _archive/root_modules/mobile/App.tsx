import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FlashMessage from 'react-native-flash-message';
import NetInfo from '@react-native-community/netinfo';

// Screens
import { HomeScreen } from './screens/HomeScreen';
import { WorkflowListScreen } from './screens/WorkflowListScreen';
import { WorkflowEditorScreen } from './screens/WorkflowEditorScreen';
import { ExecutionScreen } from './screens/ExecutionScreen';
import { SettingsScreen } from './screens/SettingsScreen';

// Services
import { useAppStore } from './store/appStore';
import BiometricAuth from './services/BiometricAuth';
import NotificationService from './services/NotificationService';
import SyncService from './services/SyncService';

// Types
import { RootStackParamList, MainTabParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
          headerShown: true,
          headerTitle: 'Dashboard',
          headerStyle: {
            backgroundColor: '#fff',
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
          },
        }}
      />
      <Tab.Screen
        name="Workflows"
        component={WorkflowListScreen}
        options={{
          tabBarLabel: 'Workflows',
          tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} />,
          headerShown: true,
          headerTitle: 'Workflows',
          headerStyle: {
            backgroundColor: '#fff',
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
          },
        }}
      />
      <Tab.Screen
        name="Executions"
        component={ExecutionScreen}
        options={{
          tabBarLabel: 'Executions',
          tabBarIcon: ({ color }) => <TabIcon icon="📊" color={color} />,
          headerShown: true,
          headerTitle: 'Executions',
          headerStyle: {
            backgroundColor: '#fff',
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} />,
          headerShown: true,
          headerTitle: 'Settings',
          headerStyle: {
            backgroundColor: '#fff',
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
          },
        }}
      />
    </Tab.Navigator>
  );
}

// Tab Icon Component
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <text style={{ fontSize: 24, color }}>{icon}</text>;
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const { setIsOnline, setSyncQueueLength } = useAppStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize services
      await Promise.all([
        BiometricAuth.initialize(),
        NotificationService.initialize(),
        SyncService.initialize(),
      ]);

      // Setup network listener
      const unsubscribe = NetInfo.addEventListener((state) => {
        setIsOnline(state.isConnected ?? false);

        // Trigger sync when coming online
        if (state.isConnected) {
          SyncService.processQueue();
        }
      });

      // Update sync queue length periodically
      const syncInterval = setInterval(async () => {
        const length = await SyncService.getQueueLength();
        setSyncQueueLength(length);
      }, 5000);

      // Cleanup
      return () => {
        unsubscribe();
        clearInterval(syncInterval);
      };
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    return null; // Or a splash screen
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#fff',
              shadowColor: 'transparent',
              elevation: 0,
            },
            headerTitleStyle: {
              fontSize: 20,
              fontWeight: 'bold',
            },
            headerTintColor: '#1f2937',
          }}
        >
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="WorkflowEditor"
            component={WorkflowEditorScreen}
            options={{
              title: 'Edit Workflow',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <FlashMessage position="top" />
    </GestureHandlerRootView>
  );
}
