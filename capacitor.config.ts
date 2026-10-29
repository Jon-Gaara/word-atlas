import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android shell (Capacitor). The web build stays the source of truth: `dist/`
 * is copied into `android/app/src/main/assets/public` by `cap sync`.
 *
 * The open dataset, illustrations and recordings live in `public/`, so a full
 * build ships them inside the APK and the app works offline (no server).
 */
const config: CapacitorConfig = {
  appId: "tech.oxlei.wordatlas",
  appName: "词光",
  webDir: "dist",
  backgroundColor: "#0D1120",
  android: {
    backgroundColor: "#0D1120",
    allowMixedContent: false,
    // No pinch/double-tap zoom: the app handles its own gestures.
    zoomEnabled: false,
  },
  plugins: {
    // Edge-to-edge on Android 15+: let the WebView see the real insets so the
    // CSS `env(safe-area-inset-*)` rules in app.css line up with the bars.
    SystemBars: {
      insetsHandling: "native",
      initialViewportFitValueHint: "cover",
    },
    SplashScreen: {
      // The JS shell hides it as soon as the app is mounted; auto-hide is the
      // safety net in case the WebView never gets there.
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: "#0D1120",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
