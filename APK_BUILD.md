# Building the Spark Android APK

Spark's Android app is a **Capacitor** wrapper around the existing React
frontend — the APK just hosts a WebView pointed at
`https://spark.proflowenergy.org`. Deploy the backend first (see
`DEPLOY.md`) so the live URL is reachable, then follow the steps here.

The Capacitor project is already scaffolded under `client/android/` and
configured in `client/capacitor.config.json`.

---

## 0. One-time local setup (on your Mac)

1. **Java 17** — required by modern Gradle:
   ```bash
   brew install --cask temurin@17
   /usr/libexec/java_home -V   # confirm 17 is listed
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   ```
2. **Android Studio**: https://developer.android.com/studio
   On first launch it installs the SDK + platform-tools. You only need
   Android Studio for initial SDK installation and to open the project if
   something goes wrong — all builds can run from the terminal.
3. **Android SDK env** (add to `~/.zshrc`):
   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
   ```

## 1. Build the web bundle

```bash
cd "/Users/aqibsohail/Dating app/client"
npm install
npm run build                 # writes ./build, what Capacitor embeds
npx cap sync android          # copies build/ → android/app/src/main/assets
```

> If the live backend isn't deployed yet, edit `capacitor.config.json`
> temporarily and swap the `server.url` to your LAN IP
> (`http://192.168.x.x:3000`) with `cleartext: true` for local testing.
> Flip it back to the HTTPS production URL before building the release
> APK — cleartext traffic is not allowed on Play Store.

## 2. Build a debug APK (quick test)

```bash
cd "/Users/aqibsohail/Dating app/client/android"
./gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

Install on a phone (USB debugging enabled):

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 3. Build a signed release APK

### 3a. Create a keystore (once — keep it safe, you need it for every
future update):

```bash
cd "/Users/aqibsohail/Dating app/client/android"
keytool -genkey -v \
  -keystore spark-release.keystore \
  -alias spark \
  -keyalg RSA -keysize 2048 -validity 10000
# Remember the keystore password + key password.
```

Add this file to `.gitignore` — **never commit the keystore.**

### 3b. Tell Gradle how to sign

Create `android/keystore.properties` (also gitignored):

```properties
storeFile=spark-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=spark
keyPassword=YOUR_KEY_PASSWORD
```

Open `android/app/build.gradle` and add inside the `android { ... }` block
if it's not already there:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile     file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias      keystoreProperties['keyAlias']
            keyPassword   keystoreProperties['keyPassword']
        }
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

### 3c. Build

```bash
cd "/Users/aqibsohail/Dating app/client/android"
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk` — this is the
signed APK you can sideload or upload to Play Console.

For Play Store, prefer the **AAB** bundle:

```bash
./gradlew bundleRelease
# app/build/outputs/bundle/release/app-release.aab
```

## 4. App icons + splash

Drop a 1024×1024 PNG at `client/resources/icon.png` and a splash at
`client/resources/splash.png`, then:

```bash
cd "/Users/aqibsohail/Dating app/client"
npx @capacitor/assets generate --android
npx cap sync android
```

## 5. Updating the APK when the backend changes

As long as `capacitor.config.json`'s `server.url` still points at the
deployed site, you don't need to rebuild the APK for backend-only
changes — the WebView just reloads the new HTML/JS. You only rebuild
when you change native Android config or bump the icon/splash.

When you *do* rebuild, remember to bump `versionCode` and `versionName`
in `android/app/build.gradle` so Play Store accepts the upload.

---

## Permissions already declared

Capacitor's default `AndroidManifest.xml` doesn't grant mic/camera/location
automatically. Open
`android/app/src/main/AndroidManifest.xml` and confirm these are present
(add any that aren't):

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>

<uses-feature android:name="android.hardware.camera" android:required="false"/>
<uses-feature android:name="android.hardware.microphone" android:required="false"/>
```

Without these the phone won't prompt for permission and WebRTC calls +
geolocation will silently fail inside the APK.

## Troubleshooting

- **"SDK location not found"** → create `android/local.properties` with
  `sdk.dir=/Users/<you>/Library/Android/sdk`
- **Java version mismatch** → `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`
- **Gradle can't download deps** → make sure you're not on a VPN that
  blocks `dl.google.com` / `repo.maven.apache.org`
- **APK installs but white-screens** → the `server.url` in
  `capacitor.config.json` is unreachable. Open the APK's WebView
  inspector from Chrome at `chrome://inspect` to see console errors.
