param(
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$AndroidSdk = $env:ANDROID_HOME,
    [string]$GradleUserHome = $env:GRADLE_USER_HOME
)
$ErrorActionPreference = 'Stop'
if (-not $JavaHome -or -not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin/java.exe'))) {
    throw 'Set JAVA_HOME or pass -JavaHome to a JDK 17 installation.'
}
if (-not $AndroidSdk -or -not (Test-Path -LiteralPath (Join-Path $AndroidSdk 'platforms/android-34/android.jar'))) {
    throw 'Set ANDROID_HOME or pass -AndroidSdk with Android platform 34 and build-tools 34.0.0 installed.'
}
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$androidProject = Join-Path $repoRoot 'android'
$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $AndroidSdk
if ($GradleUserHome) { $env:GRADLE_USER_HOME = $GradleUserHome }

Push-Location -LiteralPath $androidProject
try {
    & './gradlew.bat' :app:testDebugUnitTest :app:lintDebug :app:assembleDebug --no-daemon --console plain
    if ($LASTEXITCODE -ne 0) { throw 'Android tests, lint or build failed.' }
    $dist = Join-Path $androidProject 'dist'
    New-Item -ItemType Directory -Force -Path $dist | Out-Null
    $apk = Join-Path $dist 'ModuCabin-simulation-debug.apk'
    Copy-Item -LiteralPath (Join-Path $androidProject 'app/build/outputs/apk/debug/app-debug.apk') -Destination $apk -Force
    & python (Join-Path $PSScriptRoot 'verify_apk.py') --apk $apk --web (Join-Path $repoRoot 'web') --sdk $AndroidSdk
    if ($LASTEXITCODE -ne 0) { throw 'APK verification failed.' }
    Write-Output "Built simulation APK: $apk"
} finally {
    Pop-Location
}
