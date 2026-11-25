import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../types/navigation';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AccountProfileScreen } from '../screens/AccountProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { ExportDataScreen } from '../screens/ExportDataScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="AccountProfile" component={AccountProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="ExportData" component={ExportDataScreen} />
    </Stack.Navigator>
  );
}
