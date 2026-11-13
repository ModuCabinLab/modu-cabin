param(
    [Parameter(Mandatory = $true)][string]$KeyStore,
    [string]$KeyAlias = 'moducabin-submission',
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$AndroidSdk = $env:ANDROID_HOME,
    [string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
if (-not $JavaHome -or -not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin/java.exe'))) {
    throw 'Set JAVA_HOME to JDK 17 or pass -JavaHome.'
}
if (-not $AndroidSdk -or -not (Test-Path -LiteralPath (Join-Path $AndroidSdk 'build-tools/34.0.0/apksigner.bat'))) {
    throw 'Set ANDROID_HOME or pass -AndroidSdk with API 34 and build-tools 34.0.0.'
}
if (-not (Test-Path -LiteralPath $KeyStore)) { throw 'The specified release keystore does not exist.' }
$KeyStore = (Resolve-Path -LiteralPath $KeyStore).Path
$JavaHome = (Resolve-Path -LiteralPath $JavaHome).Path
$AndroidSdk = (Resolve-Path -LiteralPath $AndroidSdk).Path
if (-not $env:MODUCABIN_RELEASE_STORE_PASSWORD -or -not $env:MODUCABIN_RELEASE_KEY_PASSWORD) {
    throw 'Provide signing passwords through MODUCABIN_RELEASE_STORE_PASSWORD and MODUCABIN_RELEASE_KEY_PASSWORD in the process environment.'
}
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$androidProject = Join-Path $repoRoot 'android'
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $repoRoot 'artifacts' }
$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $AndroidSdk
$buildTools = Join-Path $AndroidSdk 'build-tools/34.0.0'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$OutputDirectory = (Resolve-Path -LiteralPath $OutputDirectory).Path
$apk = Join-Path $OutputDirectory 'ModuCabin_ModuCabin_release.apk'
Push-Location -LiteralPath $repoRoot
try {
    & python -m unittest discover -s './tools/android' -p 'test_verify_apk.py' -v
    if ($LASTEXITCODE -ne 0) { throw 'Release metadata verifier tests failed.' }
    Push-Location -LiteralPath $androidProject
    try {
        & './gradlew.bat' :app:testReleaseUnitTest :app:lintRelease :app:assembleRelease --no-daemon --console plain
        if ($LASTEXITCODE -ne 0) { throw 'Release tests, lint or build failed.' }
    } finally { Pop-Location }
    $unsigned = Join-Path $androidProject 'app/build/outputs/apk/release/app-release-unsigned.apk'
    & (Join-Path $buildTools 'zipalign.exe') -c 4 $unsigned
    if ($LASTEXITCODE -ne 0) { throw 'Unsigned APK alignment verification failed.' }
    & (Join-Path $buildTools 'apksigner.bat') sign --ks $KeyStore --ks-key-alias $KeyAlias --ks-pass env:MODUCABIN_RELEASE_STORE_PASSWORD --key-pass env:MODUCABIN_RELEASE_KEY_PASSWORD --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled true --v4-signing-enabled false --out $apk $unsigned
    if ($LASTEXITCODE -ne 0) { throw 'Release APK signing failed.' }
    & (Join-Path $buildTools 'zipalign.exe') -c 4 $apk
    if ($LASTEXITCODE -ne 0) { throw 'Signed APK alignment verification failed.' }
    & python (Join-Path $PSScriptRoot 'verify_apk.py') --apk $apk --web (Join-Path $repoRoot 'web') --sdk $AndroidSdk --require-release
    if ($LASTEXITCODE -ne 0) { throw 'Signed release APK verification failed.' }
    Write-Output "Verified non-debuggable release APK: $apk"
} finally { Pop-Location }
