#Requires -Version 5.1
<#
.SYNOPSIS
  Preflight and optional Android release build (Capacitor + Gradle bundleRelease).

.DESCRIPTION
  BUILD-ANDROID-01: uses JDK 21 only for Gradle (does not change global JAVA_HOME).
  Default mode is preflight (-Preflight). Use -Build to run cap:sync + bundleRelease.

  Never prints keystore passwords or secret env values.

.PARAMETER Jdk21Path
  Optional path to JDK 21 home (directory containing bin\java.exe).

.PARAMETER Preflight
  Run checks only (default if -Build not set).

.PARAMETER Build
  After preflight, run npm run cap:sync and gradlew :app:bundleRelease.

.PARAMETER SkipGradleDryRun
  Skip gradlew :app:bundleRelease -m (preflight still validates JDK/SDK/signing).

.EXAMPLE
  .\scripts\android-release.ps1 -Preflight

.EXAMPLE
  .\scripts\android-release.ps1 -Build -Jdk21Path "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
#>
[CmdletBinding()]
param(
  [string] $Jdk21Path = '',
  [switch] $Preflight,
  [switch] $Build,
  [switch] $SkipGradleDryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  param([string] $FromPath = $PSScriptRoot)
  $dir = $FromPath
  while ($dir) {
    if ((Test-Path (Join-Path $dir 'backend')) -and (Test-Path (Join-Path $dir 'web-app'))) {
      return (Resolve-Path $dir).Path
    }
    $parent = Split-Path -Parent $dir
    if (-not $parent -or $parent -eq $dir) { break }
    $dir = $parent
  }
  throw "Repo root not found from: $FromPath"
}

function Find-Jdk21Home {
  param([string] $ExplicitPath)
  if ($ExplicitPath) {
    $p = $ExplicitPath.Trim().TrimEnd('\', '/')
    if (-not (Test-Path (Join-Path $p 'bin\java.exe'))) {
      throw "Jdk21Path invalid (no bin\java.exe): $ExplicitPath"
    }
    return (Resolve-Path $p).Path
  }
  if ($env:TVDE_ANDROID_JDK21) {
    $p = $env:TVDE_ANDROID_JDK21.Trim().TrimEnd('\', '/')
    if (Test-Path (Join-Path $p 'bin\java.exe')) {
      return (Resolve-Path $p).Path
    }
  }
  $roots = @(
    'C:\Program Files\Eclipse Adoptium',
    'C:\Program Files\Microsoft',
    'C:\Program Files\Java'
  )
  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    $candidates = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match 'jdk-21|21\.' } |
      Sort-Object Name -Descending
    foreach ($dir in $candidates) {
      $java = Join-Path $dir.FullName 'bin\java.exe'
      if (-not (Test-Path $java)) { continue }
      $out = & $java -version 2>&1 | Out-String
      if ($out -match 'version "21[\."]') {
        return (Resolve-Path $dir.FullName).Path
      }
    }
  }
  return $null
}

function Test-JavaMajor {
  param([string] $JavaExe, [int] $ExpectedMajor)
  $out = & $JavaExe -version 2>&1 | Out-String
  if ($out -match 'version "(\d+)') {
    $major = [int]$Matches[1]
    if ($major -ne $ExpectedMajor) {
      throw "Expected Java $ExpectedMajor, got $major from: $JavaExe"
    }
    return $out.Trim().Split("`n")[0]
  }
  throw "Could not parse java -version from: $JavaExe"
}

function Read-GradleDistributionVersion {
  param([string] $WrapperPropertiesPath)
  $line = Get-Content $WrapperPropertiesPath | Where-Object { $_ -match '^distributionUrl=' } | Select-Object -First 1
  if ($line -match 'gradle-([0-9.]+)-') { return $Matches[1] }
  throw "Could not read Gradle version from $WrapperPropertiesPath"
}

function Test-AndroidSigningReady {
  param([string] $AndroidDir)
  $propsFile = Join-Path $AndroidDir 'keystore.properties'
  $storeFile = $env:TVDE_UPLOAD_STORE_FILE
  $storePassword = $env:TVDE_UPLOAD_STORE_PASSWORD
  $keyAlias = $env:TVDE_UPLOAD_KEY_ALIAS
  $keyPassword = $env:TVDE_UPLOAD_KEY_PASSWORD
  if (Test-Path $propsFile) {
    $lines = Get-Content $propsFile
    foreach ($line in $lines) {
      if ($line -match '^\s*storeFile\s*=\s*(.+)\s*$' -and -not $storeFile) { $storeFile = $Matches[1].Trim() }
      if ($line -match '^\s*keyAlias\s*=\s*(.+)\s*$' -and -not $keyAlias) { $keyAlias = $Matches[1].Trim() }
      if ($line -match '^\s*storePassword\s*=\s*\S' -and -not $storePassword) { $storePassword = 'set' }
      if ($line -match '^\s*keyPassword\s*=\s*\S' -and -not $keyPassword) { $keyPassword = 'set' }
    }
  }
  if (-not $storeFile -or -not $keyAlias) {
    throw 'Release signing not configured: set TVDE_UPLOAD_* env vars or android/keystore.properties (storeFile, keyAlias, passwords).'
  }
  $storePath = $storeFile
  if (-not [System.IO.Path]::IsPathRooted($storePath)) {
    $storePath = Join-Path $AndroidDir $storeFile
  }
  if (-not (Test-Path $storePath)) {
    throw "Upload keystore file not found: $storeFile"
  }
  if (-not $storePassword -or -not $keyPassword) {
    throw 'Release signing passwords missing (env or keystore.properties).'
  }
  return @{ StorePath = (Resolve-Path $storePath).Path; KeyAlias = $keyAlias }
}

function Test-AndroidSdkReady {
  param([string] $AndroidDir)
  $localProps = Join-Path $AndroidDir 'local.properties'
  $sdkDir = $null
  if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
    $sdkDir = $env:ANDROID_HOME
  } elseif (Test-Path $localProps) {
    $m = Select-String -Path $localProps -Pattern '^\s*sdk\.dir=(.+)\s*$' | Select-Object -First 1
    if ($m) {
      $raw = $m.Matches.Groups[1].Value.Trim().Replace('\:', ':').Replace('\\', '\')
      if (Test-Path $raw) { $sdkDir = $raw }
    }
  } else {
    $default = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    if (Test-Path $default) { $sdkDir = $default }
  }
  if (-not $sdkDir) {
    throw 'Android SDK not found: set ANDROID_HOME or web-app/android/local.properties sdk.dir'
  }
  $platform36 = Join-Path $sdkDir 'platforms\android-36'
  if (-not (Test-Path $platform36)) {
    throw "Android SDK platform android-36 missing under: $sdkDir"
  }
  return $sdkDir
}

if (-not $Build) { $Preflight = $true }

$repoRoot = Resolve-RepoRoot -FromPath $PSScriptRoot
$webApp = Join-Path $repoRoot 'web-app'
$androidDir = Join-Path $webApp 'android'
$gradlew = Join-Path $androidDir 'gradlew.bat'

Write-Host "== TVDE Android release ==" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"
Write-Host "Mode: $(if ($Build) { 'Build (preflight + cap:sync + bundleRelease)' } else { 'Preflight only' })"

# --- BUILD-VERSION-01: package.json vs versionName (+ Play versionCode on -Build) ---
$versionPreflight = Join-Path $webApp 'scripts\androidVersionPreflight.mjs'
if (-not (Test-Path $versionPreflight)) {
  throw "Missing version preflight script: $versionPreflight"
}
Write-Host "[..] Android version preflight (package.json vs versionName)..."
$versionArgs = @($versionPreflight, "--repo-root=$repoRoot")
if ($Build) {
  $versionArgs += '--require-new-play-code'
  Write-Host "     (new Play upload: versionCode must exceed docs/android/play_release_baseline.json)"
}
& node @versionArgs
if ($LASTEXITCODE -ne 0) {
  throw "Android version preflight failed (exit $LASTEXITCODE). Fix versions before building."
}
Write-Host "[OK] Android version preflight"

# --- JDK 21 ---
$jdk21 = Find-Jdk21Home -ExplicitPath $Jdk21Path
if (-not $jdk21) {
  throw @"
JDK 21 not found. Install Eclipse Temurin 21 LTS (winget install EclipseAdoptium.Temurin.21.JDK)
or set -Jdk21Path / env TVDE_ANDROID_JDK21 to the JDK home directory.
Do not use JDK 17 (compile 21 fails) or Android Studio JBR 25 (Gradle Groovy may fail).
"@
}
$javaExe = Join-Path $jdk21 'bin\java.exe'
$javaLine = Test-JavaMajor -JavaExe $javaExe -ExpectedMajor 21
Write-Host "[OK] JDK 21: $jdk21"
Write-Host "     $javaLine"

# --- Pinned toolchain versions (read-only) ---
$gradleVer = Read-GradleDistributionVersion -WrapperPropertiesPath (Join-Path $androidDir 'gradle\wrapper\gradle-wrapper.properties')
$rootGradle = Get-Content (Join-Path $androidDir 'build.gradle') -Raw
if ($rootGradle -notmatch "gradle:([\d.]+)") { throw 'Could not read AGP version from android/build.gradle' }
$agpVer = $Matches[1]
$pkgJson = Get-Content (Join-Path $webApp 'package.json') -Raw | ConvertFrom-Json
$capVer = $pkgJson.dependencies.'@capacitor/android'
if (-not $capVer) { $capVer = '(see package.json)' }
$varsGradle = Get-Content (Join-Path $androidDir 'variables.gradle') -Raw
if ($varsGradle -notmatch 'compileSdkVersion = (\d+)') { throw 'compileSdk not found' }
$compileSdk = $Matches[1]
Write-Host "[OK] Gradle wrapper: $gradleVer (expect 8.14.3)"
Write-Host "[OK] AGP: $agpVer (expect 8.13.0)"
Write-Host "[OK] @capacitor/android: $capVer (expect ^8.5.2)"
Write-Host "[OK] compileSdk: $compileSdk (expect 36)"
if ($gradleVer -ne '8.14.3') { Write-Warning "Unexpected Gradle version: $gradleVer" }
if ($agpVer -ne '8.13.0') { Write-Warning "Unexpected AGP version: $agpVer" }
if ($compileSdk -ne '36') { Write-Warning "Unexpected compileSdk: $compileSdk" }

# --- SDK & signing ---
$sdkDir = Test-AndroidSdkReady -AndroidDir $androidDir
Write-Host "[OK] Android SDK: $sdkDir"
$signing = Test-AndroidSigningReady -AndroidDir $androidDir
Write-Host "[OK] Release signing: store present, alias=$($signing.KeyAlias)"

# --- Gradle with JDK 21 (process-local JAVA_HOME) ---
$prevJavaHome = $env:JAVA_HOME
$env:JAVA_HOME = $jdk21
$env:PATH = "$(Join-Path $jdk21 'bin');$env:PATH"
try {
  Push-Location $androidDir
  try {
  Write-Host "[..] Stopping Gradle daemons (avoid JVM mismatch)..."
  & $gradlew --stop 2>&1 | Out-Null

  Write-Host "[..] gradlew -version"
  $gv = & $gradlew -version 2>&1 | Out-String
  if ($gv -notmatch 'Launcher JVM:\s+21\.') {
    throw "Gradle Launcher JVM is not Java 21. Output:`n$gv"
  }
  $jdkNorm = $jdk21.ToLower().Replace('/', '\')
  if ($gv -notmatch 'Daemon JVM:\s+(.+)') {
    throw "Could not parse Daemon JVM line from gradlew -version"
  }
  $daemonLine = $Matches[1].Trim().ToLower()
  if ($daemonLine -notlike "*$($jdkNorm)*") {
    throw "Gradle Daemon JVM path does not match selected JDK 21:`n$gv"
  }
  Write-Host "[OK] Gradle Launcher JVM: Java 21; Daemon home matches selected JDK"

  if (-not $SkipGradleDryRun) {
    Write-Host "[..] gradlew :app:bundleRelease -m (dry-run)"
    & $gradlew ':app:bundleRelease' '-m'
    if ($LASTEXITCODE -ne 0) { throw "Gradle dry-run failed with exit code $LASTEXITCODE" }
    Write-Host "[OK] Gradle dry-run bundleRelease"
  }

  if ($Build) {
    Write-Host "[..] npm run cap:sync"
    Push-Location $webApp
    try {
      npm run cap:sync
      if ($LASTEXITCODE -ne 0) { throw "npm run cap:sync failed with exit code $LASTEXITCODE" }
    } finally {
      Pop-Location
    }
    Write-Host "[..] gradlew :app:bundleRelease"
      & $gradlew ':app:bundleRelease'
      if ($LASTEXITCODE -ne 0) { throw "bundleRelease failed with exit code $LASTEXITCODE" }
      $aab = Join-Path $androidDir 'app\build\outputs\bundle\release\app-release.aab'
      if (-not (Test-Path $aab)) { throw "AAB not found at expected path" }
      $hash = (Get-FileHash $aab -Algorithm SHA256).Hash
      $len = (Get-Item $aab).Length
      Write-Host "[OK] AAB: $aab"
      Write-Host "     Size: $len bytes"
      Write-Host "     SHA-256: $hash"
  }
  } finally {
    Pop-Location
  }
} finally {
  if ($null -ne $prevJavaHome) { $env:JAVA_HOME = $prevJavaHome } else { Remove-Item Env:JAVA_HOME -ErrorAction SilentlyContinue }
}

Write-Host ""
Write-Host "Preflight PASSED." -ForegroundColor Green
if (-not $Build) {
  Write-Host "Next: .\scripts\android-release.ps1 -Build   (when authorized to generate AAB)"
}
