import type { CapacitorConfig } from '@capacitor/cli'

// Remote-URL mode: the APK is a thin native shell whose WebView loads the
// deployed Next.js app. Updates to the web app ship instantly — re-release
// the APK only when the native shell itself changes.
//
// Replace `FINCA_TIGRILLO_PROD_URL` with the production domain before building
// (e.g. https://tigrillo.example.com). The placeholder fails fast at build time
// if forgotten.
const PROD_URL = process.env.FINCA_TIGRILLO_PROD_URL ?? 'https://fincatigrillo.vercel.app'

const config: CapacitorConfig = {
  appId: 'com.fincatigrillo.app',
  appName: 'Finca Tigrillo',
  webDir: 'www',
  server: {
    url: PROD_URL,
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      // WebView sits below the status bar — no edge-to-edge.
      // This lets Android's per-app "automatic" notch setting work correctly.
      overlaysWebView: false,
      backgroundColor: '#0f3d2e',
      style: 'LIGHT',
    },
  },
}

export default config
