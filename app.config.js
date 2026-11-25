// EAS Build sets EAS_BUILD_PROFILE to the name of the profile being built (e.g.
// "development", "preview", "production") — missing locally (e.g. `expo start`),
// where there's no push entitlement concern either way.
const isDevelopmentBuild = process.env.EAS_BUILD_PROFILE === 'development';

export default {
  expo: {
    name: 'Practice Tracker',
    slug: 'practice-tracker',
    owner: 'aman_daurenovich',
    scheme: 'practicetracker',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.amanimanzhan.practicetracker',
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      entitlements: {
        'aps-environment': isDevelopmentBuild ? 'development' : 'production',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-secure-store',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.31004094033-9t36b5hs4f0650rvccaoiknjefjbl5ao',
        },
      ],
      'expo-sharing',
      'expo-iap',
    ],
    extra: {
      eas: {
        projectId: '29f9e9ee-fd41-49e6-99db-4ce94fc2f604',
      },
    },
  },
};
