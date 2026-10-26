import { describe, expect, it } from 'vitest'
import {
  parseBuildGradleVersions,
  readPackageVersion,
  readPlayBaseline,
  validateAndroidReleaseVersion,
} from './androidVersionPreflight.mjs'

const GRADLE_OK = `
android {
    defaultConfig {
        versionCode 3
        versionName "1.0.1"
    }
}
`

describe('androidVersionPreflight', () => {
  it('parses versionCode and versionName from build.gradle', () => {
    expect(parseBuildGradleVersions(GRADLE_OK)).toEqual({
      versionCode: 3,
      versionName: '1.0.1',
    })
  })

  it('passes when package.json matches versionName', () => {
    const result = validateAndroidReleaseVersion({
      packageJsonText: JSON.stringify({ version: '1.0.1' }),
      buildGradleText: GRADLE_OK,
    })
    expect(result.versionCode).toBe(3)
    expect(result.packageVersion).toBe('1.0.1')
  })

  it('fails when package.json diverges from versionName', () => {
    expect(() =>
      validateAndroidReleaseVersion({
        packageJsonText: JSON.stringify({ version: '1.0.0' }),
        buildGradleText: GRADLE_OK,
      }),
    ).toThrow(/must equal Android versionName/)
  })

  it('fails when versionCode is not positive', () => {
    const gradle = GRADLE_OK.replace('versionCode 3', 'versionCode 0')
    expect(() =>
      validateAndroidReleaseVersion({
        packageJsonText: JSON.stringify({ version: '1.0.1' }),
        buildGradleText: gradle,
      }),
    ).toThrow(/positive integer/)
  })

  it('requires versionCode above baseline only for new Play release', () => {
    const baseline = JSON.stringify({ lastPublishedVersionCode: 3 })
    expect(() =>
      validateAndroidReleaseVersion({
        packageJsonText: JSON.stringify({ version: '1.0.1' }),
        buildGradleText: GRADLE_OK,
        baselineText: baseline,
        requireNewPlayRelease: true,
      }),
    ).toThrow(/must be greater than last published/)

    const gradle4 = GRADLE_OK.replace('versionCode 3', 'versionCode 4')
    const ok = validateAndroidReleaseVersion({
      packageJsonText: JSON.stringify({ version: '1.0.1' }),
      buildGradleText: gradle4,
      baselineText: baseline,
      requireNewPlayRelease: true,
    })
    expect(ok.versionCode).toBe(4)
  })

  it('does not compare Play baseline without requireNewPlayRelease', () => {
    const baseline = JSON.stringify({ lastPublishedVersionCode: 99 })
    const result = validateAndroidReleaseVersion({
      packageJsonText: JSON.stringify({ version: '1.0.1' }),
      buildGradleText: GRADLE_OK,
      baselineText: baseline,
      requireNewPlayRelease: false,
    })
    expect(result.versionCode).toBe(3)
  })

  it('reads play baseline JSON', () => {
    expect(
      readPlayBaseline(JSON.stringify({ lastPublishedVersionCode: 3, lastPublishedVersionName: '1.0.1' })),
    ).toMatchObject({ lastPublishedVersionCode: 3, lastPublishedVersionName: '1.0.1' })
  })

  it('reads package version', () => {
    expect(readPackageVersion(JSON.stringify({ version: '2.3.4' }))).toBe('2.3.4')
  })
})
