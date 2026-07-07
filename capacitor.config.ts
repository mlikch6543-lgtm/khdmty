import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gerges.khdmty',
  appName: 'Khdmty',
  webDir: 'dist'
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP"
      showSpinner: false
    }
  }
};

export default config;
