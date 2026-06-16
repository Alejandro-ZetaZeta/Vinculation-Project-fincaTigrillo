# Finca Tigrillo — iOS Shell

Capacitor-based native iOS wrapper for the deployed Finca Tigrillo PWA.
Produces a signed `.ipa` via Xcode that loads the live web app inside a WKWebView.

## Audience

**ULEAM IT Matrix Department.** This shell is delivered **unsigned**. Your
team signs and publishes the app using the ULEAM institutional Apple Developer
account.

The original author (a student) had no Apple Developer access and developed
solely on Windows. A `Debug` build is verified automatically in CI to confirm
the project scaffolds, resolves CocoaPods, and compiles cleanly. **All signing,
archiving, and App Store Connect submission is your responsibility.**

## Why this exists

Same as the Android shell: distribute an installable iOS app without requiring
users to install a PWA from Safari. The shell does not contain app logic — it
points at the production URL. Deploy the web app to update the user experience
without rebuilding the IPA.

## Prerequisites (your Mac)

- macOS with **Xcode 26.5+** installed (stable, includes Command Line Tools)
- Active ULEAM institutional **Apple Developer Program** enrollment
- **CocoaPods** (`sudo gem install cocoapods` if not bundled with Xcode)

## One-time setup on your Mac

```bash
# 1. Clone the repository
git clone <repo-url>
cd Vinculation-Project-fincaTigrillo

# 2. Install shell dependencies
cd ios-shell
npm install

# 3. Scaffold the native iOS workspace (FIRST RUN ONLY on a fresh clone)
#    The `ios/` folder is gitignored — `cap add ios` regenerates it from
#    scratch every time. The `macos-latest` GitHub Actions runner does the
#    same on CI.
npx cap add ios

# 4. Sync Capacitor config + plugins into the Xcode project
npx cap sync ios

# 5. Generate iOS app icons from the institutional SVG
npm run generate:icons
# -> PNGs land in ios/App/App.xcassets/AppIcon.appiconset/

# 6. Install CocoaPods
cd ios/App
pod install
cd ../..
```

> **Why step 3 is here, not in the repo:** keeping `ios/` gitignored means a
> clean, reproducible scaffold on every clone and every CI run. No stale
> `xcuserdata`, no stale Pods, no drift between teams.

## Signing & Archive in Xcode

1. **Open the project:**
   ```bash
   npx cap open ios
   ```
   This launches Xcode with `App.xcworkspace` — always use the **workspace**,
   not the `.xcodeproj`.

2. **Select the `App` target → Signing & Capabilities:**
   - Check **Automatically manage signing**
   - **Team:** select `ULEAM University` (your institutional team)
   - **Bundle Identifier:** `com.fincatigrillo.app` (must match the ULEAM
     App Store Connect record — create it there first if missing)
   - Xcode auto-creates / refreshes the provisioning profile

3. **Update display name & version** (if not already correct) under
   **General → Identity:**
   - Display Name: `Finca Tigrillo`
   - Version: bump as needed
   - Build: increments per upload

4. **Assign app icons** (one-time, only if not already wired):
   - Open `ios/App/App.xcassets/AppIcon.appiconset/` in the file navigator
   - Drag the generated PNGs from `scripts/generate-icons.js` output into
     the matching size slots, **OR** use the iOS 14+ "Single Size" mode and
     just drop `icon-1024.png` into the 1024×1024 slot.

5. **Product → Archive:**
   - Select **Any iOS Device (arm64)** as the destination (not Simulator)
   - Menu: **Product → Archive**
   - Wait for archive to complete (2–5 min)

6. **Distribute App:**
   - In the Organizer window that opens, select the new archive
   - Click **Distribute App**
   - Choose **App Store Connect** → **Upload**
   - Keep default options (Upload symbols, manage version, etc.)
   - Sign in with the ULEAM institutional Apple ID
   - Xcode uploads the `.ipa` to App Store Connect

7. **TestFlight & App Store submission** (in App Store Connect web):
   - Select the build under your app → TestFlight tab
   - Add internal testers (ULEAM staff) and/or submit for App Store review

## Environment variable: production URL

The shell reads `FINCA_TIGRILLO_PROD_URL` at sync time. Default is
`https://fincatigrillo.vercel.app`. Override before `cap sync` if ULEAM
hosts the app on a different domain:

```bash
export FINCA_TIGRILLO_PROD_URL="https://tigrillo.uleam.edu.ec"
npx cap sync ios
```

## Verifying the shell compiles (optional, for your confidence)

The repository includes a GitHub Actions workflow
(`.github/workflows/ios-build.yml`) that runs `xcodebuild` against
`iphonesimulator` in `Debug` on every push. It is a structural smoke test
only — it does **not** sign or archive. To replicate locally:

```bash
cd ios-shell
npm ci
npx cap add ios        # if ios/ does not exist
npx cap sync ios
xcodebuild \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

## Troubleshooting

**`pod install` fails with "CocoaPods could not find compatible versions"**
- Run `pod repo update` first, then retry
- Confirm `ios-shell/package.json` Capacitor versions match `ios/App/Podfile.lock`

**Xcode says "No signing certificate found"**
- Confirm your Apple ID is added to Xcode → Settings → Accounts
- Confirm institutional team membership is active at developer.apple.com

**WebView shows blank / loading forever**
- Confirm the production URL responds from your Mac's network
- Check `Info.plist` → `NSAppTransportSecurity` — should allow HTTPS to the
  production domain (Capacitor default). WKWebView blocks cleartext by default.

**Privacy manifest warnings (iOS 17+)**
- Capacitor 8 includes a default `PrivacyInfo.xcprivacy` — no action needed
  unless ULEAM uses additional "required reason" APIs (file timestamp, disk
  space, system boot time, etc.). If Xcode warns, add the relevant reason
  under `NSPrivacyAccessedAPITypes` in the manifest.

**`ios/` folder missing after clone**
- Expected. Run `npx cap add ios` to scaffold, then `npx cap sync ios`. The
  folder is intentionally gitignored to keep the workspace clean.

## Cookie-based auth

The shell is same-origin with the production domain (`server.url` in
`capacitor.config.ts`), so the Next.js cookie-based auth in
`app/src/proxy.ts` works inside the WKWebView. No special handling needed.

## What this shell does NOT do

- Does **not** build for App Store on its own (you do that in Xcode)
- Does **not** contain any app logic — only a WKWebView pointing at prod
- Does **not** commit the `ios/` folder to git (regenerated on first
  `cap add ios` or via CI)
- Does **not** include any signing certificates, provisioning profiles,
  or App Store Connect API keys
