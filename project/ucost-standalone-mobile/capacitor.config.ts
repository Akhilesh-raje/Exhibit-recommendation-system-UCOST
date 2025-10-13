import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ucost.mobileapp',
  appName: 'UCOST Discovery Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: "#1e40af",
      showSpinner: true,
      spinnerColor: "#ffffff"
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1e40af'
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keyPassword: undefined
    }
  },
  ios: {
    contentInset: 'always'
  }
};

export default config; 