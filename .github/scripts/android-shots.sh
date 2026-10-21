#!/usr/bin/env bash
# Runs inside the Android emulator (see android-screenshots.yml): installs the debug app, gives the emulator a punch-hole camera
# cut-out, opens several pages and saves a screenshot of each, plus what the phone says about its insets and WebView.
set -x
mkdir -p shots
adb wait-for-device
adb shell input keyevent KEYCODE_WAKEUP
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
# a punch-hole camera at the top centre, like the phone this is aimed at
adb shell cmd overlay enable com.android.internal.display.cutout.emulation.hole || true
sleep 4
adb shell am force-stop dev.synapsecore.app
adb shell am start -n dev.synapsecore.app/.MainActivity
sleep 45
adb exec-out screencap -p > shots/01-start-tayo.png
i=2
for page in "" "buyers" "app/browse" "app/dream" "app/signin"; do
  adb shell am start -a android.intent.action.VIEW -d "https://www.synapsecore.dev/$page" dev.synapsecore.app
  sleep 25
  n=$(printf "%02d" $i); name=${page//\//-}; adb exec-out screencap -p > "shots/$n-${name:-landing}.png"
  i=$((i+1))
done
adb shell dumpsys window displays | grep -i -E "cutout|stable|content=|StatusBar" > shots/window.txt || true
adb shell dumpsys package com.google.android.webview | grep -i versionName > shots/webview.txt || true
adb shell dumpsys package com.android.chrome | grep -i versionName >> shots/webview.txt || true
adb shell wm size > shots/wm.txt; adb shell wm density >> shots/wm.txt
adb logcat -d -s Capacitor chromium:E > shots/logcat.txt || true
ls -la shots
