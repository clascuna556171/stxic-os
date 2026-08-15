import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Stxic Capacitor config — Android APK is a thin shell that loads the
 * deployed web app (same codebase, server-side auth intact). `server.url`
 * points at the production URL; `server.cleartext` stays false so WebCrypto +
 * WebAuthn run in a secure context. Set STXIC_APP_URL to override.
 */

const appUrl = process.env.STXIC_APP_URL || "https://stxic-os.vercel.app";

const config: CapacitorConfig = {
  appId: "com.stxic.os",
  appName: "Stxic",
  webDir: "out",
  server: {
    url: appUrl,
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
