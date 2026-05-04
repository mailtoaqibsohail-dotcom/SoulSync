import { CapacitorConfig } from '@capacitor/cli';

// Spark Android app shell. The React build is bundled into the APK so the
// UI opens instantly (no network round-trip for assets — like WhatsApp).
// API + socket traffic still goes to the production server.
const config: CapacitorConfig = {
  appId: 'org.proflowenergy.spark',
  appName: 'Spark',
  webDir: 'build',
  // Don't point `server.url` at the live site — that turns this into a thin
  // online-only wrapper. Leaving it unset means assets load from the APK.
  android: {
    allowMixedContent: false,
    // Capacitor 8 default scheme on Android is `https://localhost` — keep it
    // so the server CORS allowlist matches.
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0d0d0d',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
