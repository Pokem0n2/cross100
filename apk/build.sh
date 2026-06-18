#!/usr/bin/env bash
# Build cross100level.apk
# Requires: ANDROID_HOME set, build-tools 34.0.0, platforms;android-34
# On aarch64 (e.g. DGX Spark), uses box64 for x86_64 aapt2/zipalign/apksigner
# AND uses java -jar d8.jar explicitly (the d8 bash script can confuse box64)
set -e

WS="/home/spark/.hermes/kanban/workspaces/t_3407d04c/cross100"
ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
ANDROID_JAR="$ANDROID_HOME/platforms/android-34/android.jar"
BT="$ANDROID_HOME/build-tools/34.0.0"
D8_JAR="$BT/lib/d8.jar"
APKSIGNER_JAR="$BT/lib/apksigner.jar"
# Pick host arch
HOST_ARCH=$(uname -m)
if [ "$HOST_ARCH" = "x86_64" ]; then
  X=aapt2; Y="bash $BT/d8"; Z="bash $BT/apksigner"; W=zipalign; A=aapt
else
  X="box64 $BT/aapt2"
  Y="bash $BT/d8"
  Z="java -jar $APKSIGNER_JAR"
  W="box64 $BT/zipalign"
  A="box64 $BT/aapt"
fi
APK_DIR="$WS/apk"
BUILD_DIR="$APK_DIR/build"

# 1. Clean build dir
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/obj" "$BUILD_DIR/dex" "$BUILD_DIR/compiled"

echo "=== 1. Compile Java ==="
javac -source 8 -target 8 -bootclasspath "$ANDROID_JAR" \
  -d "$BUILD_DIR/obj" \
  "$APK_DIR/src/com/cross100/game/MainActivity.java"

echo "=== 2. DEX (with --lib to satisfy android.app.Activity reference) ==="
$Y --output "$BUILD_DIR/dex" \
  --min-api 21 \
  --lib "$ANDROID_JAR" \
  --release \
  "$BUILD_DIR/obj/com/cross100/game/MainActivity.class"

echo "=== 3. aapt2 compile (resources) ==="
$X compile -o "$BUILD_DIR/compiled/" --dir "$APK_DIR/res"

echo "=== 4. aapt2 link ==="
$X link -o "$BUILD_DIR/cross100level.unsigned.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$APK_DIR/AndroidManifest.xml" \
  --version-code 1 --version-name 1.0.0 \
  --auto-add-overlay \
  -A "$APK_DIR/assets" \
  "$BUILD_DIR/compiled"/*.flat

echo "=== 5. Add DEX to APK (must be at root as classes.dex) ==="
# PROJECT_ISSUES_LOG: dex must be at root with filename 'classes.dex' or
# Android PackageParser rejects with "INSTALL_PARSE_FAILED_BAD_PACKAGE_NAME / 异常"
cp "$BUILD_DIR/dex/classes.dex" "$BUILD_DIR/classes.dex"
(cd "$BUILD_DIR" && $A add "cross100level.unsigned.apk" "classes.dex")

echo "=== 6. zipalign ==="
$W -f 4 "$BUILD_DIR/cross100level.unsigned.apk" "$BUILD_DIR/cross100level.aligned.apk"

echo "=== 7. Sign with debug.keystore (v1 + v2 + v3, v1 needed for legacy installers) ==="
KS="$HOME/.android/debug.keystore"
if [ ! -f "$KS" ]; then
  mkdir -p "$HOME/.android"
  echo "Generating debug.keystore..."
  keytool -genkey -v -keystore "$KS" -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass android -keypass android \
    -dname "CN=Android Debug,O=Android,C=US"
fi

# --v1-signing-enabled=true forces JAR/META-INF signing block too
# (default v2+v3 alone misses it, which some installers reject)
$Z sign --ks "$KS" \
  --ks-pass pass:android --key-pass pass:android \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$BUILD_DIR/cross100level.apk" \
  "$BUILD_DIR/cross100level.aligned.apk"

echo "=== 8. Verify ==="
$Z verify --verbose "$BUILD_DIR/cross100level.apk"

# 9. Copy to workspace root
cp "$BUILD_DIR/cross100level.apk" "$WS/cross100level.apk"
ls -la "$WS/cross100level.apk"
echo "✅ APK built: $WS/cross100level.apk"
