# Restoring AdMob

AdMob (`react-native-google-mobile-ads`) was fully removed for the v1.0 App Store
submission — no ads, no tracking SDK in the binary. The working integration was kept on a
separate local branch (`admob-v1.1`, created at the commit right before removal).

To bring it back:

1. Restore the banner component `components/AdBanner.tsx` (3s-delayed close button, hides
   itself on close).
2. `npx expo install react-native-google-mobile-ads`.
3. `app.config.js` → `expo.plugins`: add back
   ```js
   [
     'react-native-google-mobile-ads',
     {
       iosAppId: 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX', // your AdMob App ID
       userTrackingUsageDescription: 'This identifier will be used to deliver personalized ads to you.',
     },
   ],
   ```
4. `App.tsx`: re-add `import mobileAds from 'react-native-google-mobile-ads';` and the
   `mobileAds().initialize();` call.
5. `screens/TimerScreen.tsx`: re-add the `isAdVisible` state + `useFocusEffect` reset (so
   the ad reappears when the Timer tab regains focus) and the `<AdBanner>` block below the
   timer circle.
6. `.env` / `.env.example`: re-add
   ```
   EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
   ```
   with your banner unit ID from AdMob → Ad units. Never commit the real value.
7. This re-adds a native module — a new EAS build (dev client, then production) is
   required before the ad will actually run on-device.
