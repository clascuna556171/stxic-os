# Building the Stxic Android APK

Full step-by-step guide to turn the Stxic web app into a signed Android APK you
can sideload. This covers everything from prerequisites to testing the final
`.apk` on your phone.

> **What you're building:** a **thin Capacitor shell**. The APK is a WebView
> that loads `https://stxic-os.vercel.app` — the same app you see in a browser.
> Web features deploy automatically (no reinstall); the APK only changes when
> the native layer changes (permissions, push config, icon, splash).

---

## 0. Prerequisites

| Tool | Why | Where to get it |
| --- | --- | --- |
| **Node.js 20+** | Runs the Capacitor CLI + npm scripts | https://nodejs.org |
| **Java 17 (JDK)** | Gradle (the Android build system) requires it | https://adoptium.net (Temurin 17) |
| **Android Studio** | Bundles the Android SDK + the build UI | https://developer.android.com/studio |
| **A phone or emulator** | Test the APK | any Android device, or the built-in emulator |

Verify from a terminal in `C:\Users\Sebaz\stxic`:

```bash
node -v        # v20 or newer
java -version  # openjdk 17
```

> **First time?** Install Android Studio, open it once, and let the **SDK
> Manager** install the Android SDK. You do **not** need the emulator if you'll
> test on a real phone.

---

## 1. Prereq: the web app must be deployed

The APK loads the live URL. Confirm the site is up before building:

```bash
curl -I https://stxic-os.vercel.app
```

Expect `HTTP/1.1 200` (or `308` redirect → 200). If you ever change the URL,
edit `capacitor.config.ts`:

```ts
const appUrl = process.env.STXIC_APP_URL || "https://stxic-os.vercel.app";
```

Then re-run the `cap sync` step below.

---

## 2. Install dependencies (first time only)

```bash
cd C:\Users\Sebaz\stxic
npm install
```

This installs Capacitor (`@capacitor/core`, `@capacitor/cli`,
`@capacitor/android`) and the push plugin (`@capacitor/push-notifications`).

---

## 3. Sync the native project

Capacitor copies your web assets + config into the `android/` folder. Run this
**every time** you change anything that affects the native layer (icon, config,
plugins, permissions):

```bash
npm run cap:sync        # = cap sync android
```

> `android/` is committed to the repo, so a fresh clone already has it — but
> always run `cap sync` after `npm install` or config changes to stay in sync.

---

## 4. Verify Firebase push wiring (optional but recommended)

If you want push notifications to work in the APK:

1. `android/app/google-services.json` must exist (already committed). It must
   match your Firebase project and the app ID below.
2. Confirm the package ID matches everywhere:
   - `android/app/build.gradle` → `applicationId "com.stxic.os"`
   - `android/app/google-services.json` → `client_info.android_client_info.package_name` → `com.stxic.os`
3. `AndroidManifest.xml` already has the `POST_NOTIFICATIONS` permission for
   Android 13+.

If you regenerate `google-services.json` from the Firebase console, replace the
file and re-run `npm run cap:sync`.

---

## 5. Open in Android Studio

```bash
npm run cap:open         # = cap open android
```

Or manually: Android Studio → **File → Open** → select
`C:\Users\Sebaz\stxic\android`.

**Let Gradle finish its first sync** — it downloads the Gradle distribution and
dependencies. On a first run this can take several minutes. When it's done the
project loads with no build errors. If it prompts to update AGP/Gradle, choose
**Don't remind me again / do not update** — the pinned versions are intentional.

---

## 6. Build a debug APK (fastest way to test)

Debug APKs are unsigned-but-installable and build in ~1 minute. Perfect for
first testing.

1. In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for the "APK(s) generated successfully" toast.
3. Click **locate** in the notification, or navigate to:

```
C:\Users\Sebaz\stxic\android\app\build\outputs\apk\debug\app-debug.apk
```

This is your test APK.

> **Command-line alternative** (no Android Studio UI):
>
> ```bash
> cd android
> .\gradlew.bat assembleDebug
> ```
>
> Output: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## 7. Build a release APK (signed, for sharing/install)

A release APK can be **self-signed** (fine for sideloading) or **Play-Store**
signed (only needed if you publish). We're self-signing.

### 7a. Create a keystore (one time)

In Android Studio:

1. **Build → Generate Signed App Bundle / APK…**
2. Choose **APK** → **Next**.
3. Under **Key store path** → **Create new…**
4. Fill in:
   - **Key store path**: `C:\Users\Sebaz\stxic\android\stxic-release.keystore`
   - **Password / Confirm**: pick a strong password and **write it down** —
     losing it means you can never update this app under the same signature.
   - **Alias**: `stxic`
   - **Validity (years)**: `25`
   - **First and Last Name**: your name (or `Stxic`)
5. **OK** → **Next** → choose **release** build type → **V1 + V2 signature
   schemes** (V1 is needed for older Android; V2 for modern) → **Finish**.

> **Command-line alternative** using the JDK's `keytool`:
>
> ```bash
> keytool -genkey -v -keystore android\stxic-release.keystore `
>   -alias stxic -keyalg RSA -keysize 2048 -validity 9125
> ```

The keystore will be saved at
`android\stxic-release.keystore`. **Add it to `.gitignore`** (it's a secret —
anyone with it can publish updates as you):

```
# gitignore
android/stxic-release.keystore
```

### 7b. Sign the release APK

If you used the wizard in 7a, it signs and produces the file automatically at:

```
C:\Users\Sebaz\stxic\android\app\release\app-release.apk
```

If you want to sign an already-built unsigned release APK via the command
line, run in Android Studio: **Build → Generate Signed Bundle / APK** again
with your existing keystore.

---

## 8. Install on your phone

### On a real device (recommended)

1. Enable **Developer options** on your phone:
   Settings → About phone → tap **Build number** 7 times.
2. Settings → Developer options → enable **USB debugging**.
3. Plug the phone in via USB and accept the debugging prompt.
4. Open the APK via one of:

   - **Android Studio**: drag `app-debug.apk` onto a running emulator, or use
     **Run ▶** with the phone selected as the target.
   - **adb** (Android SDK platform-tools):
     ```bash
     adb install -r android\app\build\outputs\apk\debug\app-debug.apk
     ```
   - **Sideload without a cable**: copy the `.apk` to the phone (Google
     Drive / USB / email), tap it, and allow **"Install unknown apps"** when
     prompted.

5. Open **Stxic** from the app drawer. It loads the live web app.

### On the emulator

Android Studio → Device Manager → **Create Virtual Device** → pick a phone →
**Start**. Then drag the APK onto the emulator window (or `adb install -r`).

---

## 9. First-launch checklist

- [ ] App opens to the Stxic login screen (not a blank/error page).
- [ ] Sign in with an existing account works (session survives restarts).
- [ ] **Publish to web** from Notes shows a public `/p/<slug>` page.
- [ ] **Push notifications**: Settings → Push notifications → enable → grant
      permission → trigger a Focus session to completion and confirm a
      notification arrives (with the app closed too).
- [ ] **Biometric unlock**: Settings → Biometric unlock → Enable → auto-lock →
      unlock with your fingerprint/face.

> **Troubleshooting "wrong URL" or login loop:** your phone may be behind the
> emulator's network rules. If you're testing against a **local** deployment
> rather than the deployed site, forward the port:
>
> ```bash
> adb reverse tcp:3000 tcp:3000
> ```
>
> and set `capacitor.config.ts` `server.url` to `http://localhost:3000`.

---

## 10. Updating the app later

Because the APK is a **thin shell over the web app**:

| What changed | What to do |
| --- | --- |
| Web features (most things) | **Nothing.** Deploy to Vercel; the app picks it up next open. |
| Native layer (icon, permissions, push, plugins, config) | `npm run cap:sync` → open `android/` → rebuild with the **same keystore** → reinstall the new APK. |

When you rebuild after native changes, bump the version so Android treats it as
an update:

`android/app/build.gradle`:
```gradle
versionCode 2      // +1 every rebuild you install
versionName "2.0"  // human-readable
```

---

## 11. Common errors

| Error | Fix |
| --- | --- |
| `SDK location not found` | Open Android Studio → SDK Manager → install the platform tools + `platforms;android-36`. |
| `Could not find com.android.tools.build:gradle:8.13.0` | Android Studio needs internet on first sync; retry after it downloads. |
| `require('jose')` / `ERR_REQUIRE_ESM` | That's a **deploy** issue, not APK. Ensure `jose@5.10.0` override is in `package.json` (already is). |
| Gradle sync "update AGP" prompt | Decline. Pinned versions are intentional. |
| `VersionCode` not updated / install says "app not installed" | Bump `versionCode` (section 10) or uninstall the old APK first. |
| Push notifications don't arrive | Confirm `google-services.json` exists, package IDs match (section 4), and the phone grants notification permission. |

---

## 12. Cheat sheet

```bash
npm install               # 1. deps
npm run cap:sync          # 2. sync native project
npm run cap:open          # 3. open Android Studio
# 4. Build → Build APK(s)   → debug (fast test)
# 5. Build → Generate Signed → release (sharing)
adb install -r android\app\build\outputs\apk\debug\app-debug.apk   # install
```

APK output locations:

```
android\app\build\outputs\apk\debug\app-debug.apk     # debug
android\app\release\app-release.apk                   # signed release
```
