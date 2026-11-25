import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList } from '../types/navigation';
import { useTheme } from '../theme/ThemeContext';
import { HomeScreen } from '../screens/HomeScreen';
import { TimerScreen } from '../screens/TimerScreen';
import { AvatarScreen } from '../screens/AvatarScreen';
import { SettingsStackNavigator } from './SettingsStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'book-outline',
  Timer: 'timer-outline',
  Avatar: 'person-outline',
  Settings: 'settings-outline',
};

export function MainTabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: { backgroundColor: theme.colors.tabBarBackground, borderTopColor: theme.colors.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Timer" component={TimerScreen} />
      <Tab.Screen name="Avatar" component={AvatarScreen} />
      <Tab.Screen name="Settings" component={SettingsStackNavigator} />
    </Tab.Navigator>
  );
}
