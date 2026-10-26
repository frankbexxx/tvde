/**
 * BUILD-VERSION-01: align package.json (canonical UI version) with Android versionName.
 * Optional: enforce versionCode > lastPublished when preparing a new Play upload.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function parseBuildGradleVersions(buildGradleText) {
  const versionCodeMatch = buildGradleText.match(/versionCode\s+(\d+)/)
  const versionNameMatch = buildGradleText.match(/versionName\s+"([^"]+)"/)
  if (!versionCodeMatch || !versionNameMatch) {
    throw new Error('Could not parse versionCode/versionName from app/build.gradle')
  }
  const versionCode = Number.parseInt(versionCodeMatch[1], 10)
  const versionName = versionNameMatch[1]
  return { versionCode, versionName }
}

export function readPackageVersion(packageJsonText) {
  const pkg = JSON.parse(packageJsonText)
  if (typeof pkg.version !== 'string' || !pkg.version.trim()) {
    throw new Error('package.json missing string "version"')
  }
  return pkg.version.trim()
}

export function readPlayBaseline(baselineText) {
  const data = JSON.parse(baselineText)
  const code = data.lastPublishedVersionCode
  if (!Number.isInteger(code) || code < 1) {
    throw new Error('play_release_baseline.json: lastPublishedVersionCode must be a positive integer')
  }
  return {
    lastPublishedVersionCode: code,
    lastPublishedVersionName:
      typeof data.lastPublishedVersionName === 'string' ? data.lastPublishedVersionName : null,
    notes: typeof data.notes === 'string' ? data.notes : null,
  }
}

/**
 * @returns {{ ok: true, packageVersion: string, versionName: string, versionCode: number }}
 */
export function validateAndroidReleaseVersion(options) {
  const {
    packageJsonText,
    buildGradleText,
    baselineText = null,
    requireNewPlayRelease = false,
  } = options

  const packageVersion = readPackageVersion(packageJsonText)
  const { versionCode, versionName } = parseBuildGradleVersions(buildGradleText)

  const errors = []

  if (!Number.isInteger(versionCode) || versionCode < 1) {
    errors.push(`versionCode must be a positive integer (got ${versionCode})`)
  }

  if (packageVersion !== versionName) {
    errors.push(
      `package.json version "${packageVersion}" must equal Android versionName "${versionName}" (canonical UI version)`,
    )
  }

  if (requireNewPlayRelease) {
    if (!baselineText) {
      errors.push('New Play release check requires docs/android/play_release_baseline.json')
    } else {
      const baseline = readPlayBaseline(baselineText)
      if (versionCode <= baseline.lastPublishedVersionCode) {
        errors.push(
          `versionCode ${versionCode} must be greater than last published Play versionCode ${baseline.lastPublishedVersionCode} (update baseline after a successful upload)`,
        )
      }
    }
  }

  if (errors.length > 0) {
    const err = new Error(errors.join('\n'))
    err.details = { packageVersion, versionName, versionCode, errors }
    throw err
  }

  return { ok: true, packageVersion, versionName, versionCode }
}

export function resolveDefaultPaths(repoRoot) {
  const root = resolve(repoRoot)
  return {
    repoRoot: root,
    packageJsonPath: join(root, 'web-app', 'package.json'),
    buildGradlePath: join(root, 'web-app', 'android', 'app', 'build.gradle'),
    baselinePath: join(root, 'docs', 'android', 'play_release_baseline.json'),
  }
}

export function runAndroidVersionPreflightFromDisk(options = {}) {
  const repoRoot = options.repoRoot ?? resolve(join(__dirname, '..', '..'))
  const paths = resolveDefaultPaths(repoRoot)
  const packageJsonText = readFileSync(paths.packageJsonPath, 'utf8')
  const buildGradleText = readFileSync(paths.buildGradlePath, 'utf8')
  let baselineText = null
  if (options.requireNewPlayRelease) {
    if (!existsSync(paths.baselinePath)) {
      throw new Error(`Missing baseline file: ${paths.baselinePath}`)
    }
    baselineText = readFileSync(paths.baselinePath, 'utf8')
  }
  return validateAndroidReleaseVersion({
    packageJsonText,
    buildGradleText,
    baselineText,
    requireNewPlayRelease: Boolean(options.requireNewPlayRelease),
  })
}

function main() {
  const args = process.argv.slice(2)
  const requireNewPlayRelease = args.includes('--require-new-play-code')
  const repoRootArg = args.find((a) => a.startsWith('--repo-root='))
  const repoRoot = repoRootArg ? repoRootArg.split('=')[1] : undefined

  try {
    const result = runAndroidVersionPreflightFromDisk({ repoRoot, requireNewPlayRelease })
    console.log(
      `[OK] Android version preflight: package.json=${result.packageVersion}, versionName=${result.versionName}, versionCode=${result.versionCode}`,
    )
    if (requireNewPlayRelease) {
      console.log('[OK] versionCode is above last published Play baseline (new upload).')
    }
    process.exit(0)
  } catch (e) {
    console.error('[FAIL] Android version preflight:')
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
if (isMain) {
  main()
}
