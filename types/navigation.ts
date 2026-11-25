import type { NavigatorScreenParams } from '@react-navigation/native';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  AccountProfile: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  About: undefined;
  ExportData: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Timer: undefined;
  Avatar: undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

export type RootStackParamList = {
  SignUp: undefined;
  CreateAccount: { email?: string } | undefined;
  Login: undefined;
  ForgotPassword: { email?: string } | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
