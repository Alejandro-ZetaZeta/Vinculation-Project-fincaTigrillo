# Finca Tigrillo — Android Shell

Capacitor-based native Android wrapper for the deployed Finca Tigrillo PWA.
Produces a signed `.apk` that loads the live web app inside a WebView.

## Why this exists

The Next.js app already runs as an installable PWA. This shell exists only to:

1. Distribute an installable `.apk` via **GitHub Releases** (no Play Store).
2. Give users who can't install PWAs from a browser a one-tap install path.

The shell does not contain app logic — it points at the production URL.
Deploy the web app to update the user-facing experience without rebuilding
or re-releasing the APK.

## One-time setup

Requires the Android SDK (Android Studio installed, `ANDROID_HOME` set) and JDK 17+.

```bash
cd android-shell
npm install
# Sets FINCA_TIGRILLO_PROD_URL for the cap commands below.
# On Windows PowerShell: $env:FINCA_TIGRILLO_PROD_URL = "https://fincatigrillo.vercel.app"
export FINCA_TIGRILLO_PROD_URL="https://fincatigrillo.vercel.app"
npx cap add android        # generates the android/ project (first time only)
npx cap sync android       # copies config + plugins into android/
```

## Signing key (one-time)

Generate a release keystore outside the repo:

```bash
keytool -genkey -v -keystore tigrillo-release.jks \
        -keyalg RSA -keysize 2048 -validity 10000 -alias tigrillo
```

Store the path + password somewhere safe (1Password, password manager).
Reference them at build time via environment variables — never commit the
`.jks` file (it's already in `.gitignore`).

Then add a `signingConfig` block to `android/app/build.gradle` that reads
those env vars, and reference it from the `release` `buildType`.

## Building a release APK

```bash
cd android-shell
$env:FINCA_TIGRILLO_PROD_URL = "https://your-domain.com"
$env:TIGRILLO_KEYSTORE_PATH  = "C:\path\to\tigrillo-release.jks"
$env:TIGRILLO_KEY_ALIAS      = "tigrillo"
$env:TIGRILLO_STORE_PASSWORD = "..."
$env:TIGRILLO_KEY_PASSWORD   = "..."
npx cap sync android
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Publishing on GitHub Releases

```bash
gh release create mobile-v1.0.0 \
   ./android/app/build/outputs/apk/release/app-release.apk \
   --title "Finca Tigrillo Android v1.0.0" \
   --notes "Sideload: enable 'Install from unknown sources' then open the APK."
```

End users:

1. Download the `.apk` from the GitHub Releases page on their Android device.
2. Enable **Install from unknown sources** for their browser.
3. Tap the downloaded file to install.

## Notes

- Cookie-based auth (`app/src/proxy.ts`) works inside the WebView because
  `server.url` makes the shell same-origin with the production domain.
- The `www/index.html` placeholder is only shown briefly while the WebView
  resolves the remote URL, or when the device is offline.
