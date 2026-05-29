@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  CROSS100 Solver APK Build
echo ============================================

set AAPT2=C:\Users\iamPe\.gradle\caches\9.4.1\transforms\8c8d2d41aae58399552bcab1b244bc4c\transformed\aapt2-9.2.0-15009934-windows\aapt2.exe
set D8=D:\android-sdk\cmdline-tools\latest\bin\d8.bat
set APKSIGNER=D:\android-sdk\build-tools\35.0.0\apksigner.bat
set ANDROID_JAR=D:\android-sdk\platforms\android-36\android.jar
set "PROJ=%~dp0"
set "BUILD=%PROJ%build"

if exist "%BUILD%" rmdir /s /q "%BUILD%"
mkdir "%BUILD%"

echo [1/6] aapt2 compile...
"%AAPT2%" compile --dir "%PROJ%res" -o "%BUILD%\res.zip"
if errorlevel 1 (echo FAILED & exit /b 1)

echo [2/6] aapt2 link...
"%AAPT2%" link -o "%BUILD%\base.apk" --manifest "%PROJ%AndroidManifest.xml" -I "%ANDROID_JAR%" --java "%BUILD%\gen" --auto-add-overlay "%BUILD%\res.zip"
if errorlevel 1 (echo FAILED & exit /b 1)

echo [3/6] javac...
javac -source 11 -target 11 -classpath "%ANDROID_JAR%" -sourcepath "%BUILD%\gen;%PROJ%src" -d "%BUILD%\obj" "%PROJ%src\com\cross100\game\MainActivity.java" 2>nul
if not exist "%BUILD%\obj\com\cross100\game\MainActivity.class" (echo FAILED javac & exit /b 1)

echo [4/6] d8...
call "%D8%" --min-api 21 --lib "%ANDROID_JAR%" --output "%BUILD%" "%BUILD%\obj\com\cross100\game\MainActivity.class" 2>nul
if not exist "%BUILD%\classes.dex" (echo FAILED d8 & exit /b 1)

echo [5/6] packaging...
copy /y "%BUILD%\base.apk" "%BUILD%\unsigned.apk" >nul

:: Write a PowerShell script to avoid escaping issues
echo Add-Type -Assembly 'System.IO.Compression.FileSystem' > "%BUILD%\pack.ps1"
echo $z=[System.IO.Compression.ZipFile]::Open('%BUILD%\unsigned.apk','Update') >> "%BUILD%\pack.ps1"
echo foreach($e in @(@('classes.dex','%BUILD%\classes.dex'),@('assets/index.html','%PROJ%assets\index.html'),@('assets/solver.js','%PROJ%assets\solver.js'))){ >> "%BUILD%\pack.ps1"
echo   $n=$z.CreateEntry($e[0]); $w=$n.Open(); $r=[System.IO.File]::OpenRead($e[1]); $r.CopyTo($w); $r.Close(); $w.Close() >> "%BUILD%\pack.ps1"
echo } >> "%BUILD%\pack.ps1"
echo $z.Dispose() >> "%BUILD%\pack.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%BUILD%\pack.ps1"
if errorlevel 1 (echo FAILED packaging & exit /b 1)

echo [6/6] signing...
if not exist "%USERPROFILE%\.android\debug.keystore" (
    keytool -genkeypair -v -keystore "%USERPROFILE%\.android\debug.keystore" -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" 2>nul
)
call "%APKSIGNER%" sign --min-sdk-version 21 --ks "%USERPROFILE%\.android\debug.keystore" --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android --out "%BUILD%\cross100solver.apk" "%BUILD%\unsigned.apk" 2>nul

for %%A in ("%BUILD%\cross100solver.apk") do echo OK: %%~zA bytes
copy /y "%BUILD%\cross100solver.apk" "%PROJ%..\cross100solver.apk" >nul
endlocal
