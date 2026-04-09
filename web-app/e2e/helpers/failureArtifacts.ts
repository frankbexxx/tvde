/**
 * Diagnóstico em falha: anexa evidências ao relatório Playwright (test-results/).
 * Não corrige o produto — só expõe estado para identificar a causa.
 */
import type { Page, TestInfo } from '@playwright/test'

type Role = 'driver' | 'passenger'

const buffers: Record<Role, { console: string[]; network: string[] }> = {
  driver: { console: [], network: [] },
  passenger: { console: [], network: [] },
}

const active: Partial<Record<Role, Page>> = {}
const meta: Record<string, string> = {}

export function resetFailureArtifactState(): void {
  buffers.driver.console = []
  buffers.driver.network = []
  buffers.passenger.console = []
  buffers.passenger.network = []
  active.driver = undefined
  active.passenger = undefined
  for (const k of Object.keys(meta)) delete meta[k]
}

export function setFailureArtifactMeta(key: string, value: string): void {
  meta[key] = value
}

function wirePage(role: Role, page: Page): void {
  active[role] = page
  page.on('console', (msg) => {
    buffers[role].console.push(`[${msg.type()}] ${msg.text()}`)
  })
  page.on('pageerror', (e) => {
    buffers[role].console.push(`PAGEERROR ${e.message}\n${e.stack ?? ''}`)
  })
  page.on('response', (res) => {
    const u = res.url()
    if (!u.includes('/driver/trips/available')) return
    buffers[role].network.push(`${res.request().method()} ${res.status()} ${u}`)
  })
}

export function trackDriverPageForArtifacts(page: Page): void {
  wirePage('driver', page)
}

export function trackPassengerPageForArtifacts(page: Page): void {
  wirePage('passenger', page)
}

function trunc(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n…truncated (${s.length} chars total)`
}

async function attachRoleBundle(
  testInfo: TestInfo,
  role: Role,
  page: Page | undefined
): Promise<void> {
  if (!page || page.isClosed()) return
  const p = `${role}`

  try {
    await testInfo.attach(`${p}-01-fullpage.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  } catch {
    await testInfo.attach(`${p}-01-fullpage.png`, {
      body: Buffer.from('screenshot failed'),
      contentType: 'text/plain',
    })
  }

  await testInfo.attach(`${p}-02-url.txt`, {
    body: page.url(),
    contentType: 'text/plain',
  })

  let storageJson = '{}'
  try {
    storageJson = await page.evaluate(() =>
      JSON.stringify(
        {
          localStorage: { ...localStorage },
          sessionStorage: { ...sessionStorage },
        },
        null,
        2
      )
    )
  } catch (e) {
    storageJson = JSON.stringify({ error: String(e) })
  }
  await testInfo.attach(`${p}-03-storage.json`, {
    body: storageJson,
    contentType: 'application/json',
  })

  let bodyText = ''
  try {
    bodyText = await page.locator('body').innerText()
  } catch (e) {
    bodyText = String(e)
  }
  await testInfo.attach(`${p}-04-body-innerText.txt`, {
    body: trunc(bodyText, 48_000),
    contentType: 'text/plain',
  })

  let headingsButtons = ''
  try {
    headingsButtons = await page.evaluate(() => {
      const hs = Array.from(document.querySelectorAll('h1,h2')).map((el) => el.textContent?.trim() ?? '')
      const bs = Array.from(document.querySelectorAll('button')).map((el) => el.textContent?.trim() ?? '')
      return `H1/H2:\n${hs.join('\n')}\n\nBUTTONS:\n${bs.join('\n')}`
    })
  } catch (e) {
    headingsButtons = String(e)
  }
  await testInfo.attach(`${p}-05-headings-buttons.txt`, {
    body: trunc(headingsButtons, 24_000),
    contentType: 'text/plain',
  })

  await testInfo.attach(`${p}-06-console.txt`, {
    body: buffers[role].console.length ? buffers[role].console.join('\n') : '(no console lines)',
    contentType: 'text/plain',
  })

  await testInfo.attach(`${p}-07-network-available.txt`, {
    body:
      buffers[role].network.length > 0
        ? buffers[role].network.join('\n')
        : '(no /driver/trips/available responses captured)',
    contentType: 'text/plain',
  })

  let aceitarState = ''
  try {
    const loc = page.getByRole('button', { name: /^ACEITAR$/i })
    const count = await loc.count()
    const vis = count > 0 ? await loc.first().isVisible() : false
    aceitarState = `ACEITAR count=${count} firstVisible=${vis}`
    if (count > 0) {
      try {
        const outer = await loc.first().evaluate((el) => el.outerHTML)
        aceitarState += `\nouterHTML: ${trunc(outer, 4000)}`
      } catch {
        /* ignore */
      }
    }
  } catch (e) {
    aceitarState = String(e)
  }
  await testInfo.attach(`${p}-08-aceitar-state.txt`, {
    body: aceitarState,
    contentType: 'text/plain',
  })

  let mainHtml = ''
  try {
    const main = page.locator('main').first()
    if ((await main.count()) > 0) {
      mainHtml = await main.innerHTML()
    } else {
      mainHtml = '(no <main>)'
    }
  } catch (e) {
    mainHtml = String(e)
  }
  await testInfo.attach(`${p}-09-main-innerHTML.txt`, {
    body: trunc(mainHtml, 32_000),
    contentType: 'text/plain',
  })

  await testInfo.attach(`${p}-10-meta.json`, {
    body: JSON.stringify(
      {
        ...meta,
        role,
        note: 'Sem JWT em claro — só metadados definidos pelo spec.',
      },
      null,
      2
    ),
    contentType: 'application/json',
  })
}

/** Chamar no afterEach: só corre quando o teste falhou ou timeout. */
export async function attachFailureArtifactsIfNeeded(testInfo: TestInfo): Promise<void> {
  if (testInfo.status !== 'failed' && testInfo.status !== 'timedOut') {
    resetFailureArtifactState()
    return
  }
  try {
    await attachRoleBundle(testInfo, 'driver', active.driver)
    await attachRoleBundle(testInfo, 'passenger', active.passenger)
  } finally {
    resetFailureArtifactState()
  }
}
