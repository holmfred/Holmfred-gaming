/**
 * Fetch MobyGames catalogs for selected platforms into src/data/*.json.
 *
 * Setup:
 *   MOBYGAMES_API_KEY in .env
 *   npm run fetch-games
 *
 * Resumable: re-run continues from saved progress for incomplete platforms.
 * Rate limit: ~1 request/second.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'src', 'data')
const API_BASE = 'https://api.mobygames.com/v1/games'
const PAGE_SIZE = 100
const REQUEST_GAP_MS = 1100
const SAVE_EVERY_PAGES = 5

const PLATFORMS = [
  { id: 141, name: 'PlayStation 4', file: 'PlayStation_4.json' },
  { id: 288, name: 'PlayStation 5', file: 'PlayStation_5.json' },
]

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env')
  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function dumpCompact(games, filePath) {
  const lines = games.map((game) => JSON.stringify(game, null, 0))
  writeFileSync(filePath, `[\n  ${lines.join(',\n  ')}\n]\n`, 'utf8')
}

function progressPath(file) {
  return path.join(DATA_DIR, `${file}.progress.json`)
}

function httpsToSecure(url) {
  if (!url) return null
  return url.replace(/^http:\/\//i, 'https://')
}

function normalizeGenre(genre) {
  return genre.trim().toLowerCase().replace(/ /g, '-')
}

/** Drop only-Compilation entries and any Special edition titles. */
function shouldSkipGame(game) {
  const genres = (game.genres || [])
    .filter((genre) => typeof genre === 'string' && genre.trim())
    .map(normalizeGenre)
  if (genres.length === 0) return false
  if (genres.every((genre) => genre === 'compilation')) return true
  if (genres.some((genre) => genre.includes('special-edition'))) return true
  return false
}

function releaseYearForPlatform(apiGame, platformId) {
  const release = (apiGame.platforms || []).find(
    (item) => item.platform_id === platformId,
  )
  const date = release?.first_release_date
  if (!date) return null
  const year = Number.parseInt(String(date).slice(0, 4), 10)
  return Number.isFinite(year) ? year : null
}

function mapGame(apiGame, platformId) {
  const cover =
    httpsToSecure(apiGame.sample_cover?.thumbnail_image) ||
    httpsToSecure(apiGame.sample_cover?.image) ||
    null

  return {
    id: apiGame.game_id,
    url: apiGame.moby_url,
    title: apiGame.title,
    genres: (apiGame.genres || []).map((genre) => genre.genre_name),
    release_year: releaseYearForPlatform(apiGame, platformId),
    cover,
  }
}

function rateLimitWaitMs(message, attempt) {
  const match = String(message).match(/reset in (\d+)\s*seconds/i)
  if (match) return (Number(match[1]) + 15) * 1000
  return Math.min(15000, attempt * 2500)
}

async function fetchPage(platformId, offset, apiKey, attempt = 1) {
  const params = new URLSearchParams({
    api_key: apiKey,
    platform: String(platformId),
    limit: String(PAGE_SIZE),
    offset: String(offset),
    format: 'normal',
  })

  const response = await fetch(`${API_BASE}?${params}`)
  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    if (attempt < 8 && (response.status >= 500 || response.status === 429)) {
      const wait = rateLimitWaitMs(text, attempt)
      console.log(`retryable ${response.status}, waiting ${wait}ms…`)
      await sleep(wait)
      return fetchPage(platformId, offset, apiKey, attempt + 1)
    }
    throw new Error(`Invalid JSON (${response.status}): ${text.slice(0, 200)}`)
  }

  if (!response.ok) {
    const message = data?.message || data?.error || text.slice(0, 200)
    if (attempt < 8 && (response.status >= 500 || response.status === 429)) {
      const wait = rateLimitWaitMs(message, attempt)
      console.log(`API ${response.status}, waiting ${Math.round(wait / 1000)}s…`)
      await sleep(wait)
      return fetchPage(platformId, offset, apiKey, attempt + 1)
    }
    throw new Error(`API ${response.status}: ${message}`)
  }

  return Array.isArray(data.games) ? data.games : []
}

async function fetchPlatform(platform, apiKey, { force = false } = {}) {
  const filePath = path.join(DATA_DIR, platform.file)
  const progPath = progressPath(platform.file)

  let offset = 0
  let byId = new Map()

  if (force) {
    console.log(`${platform.name}: --force, fetching from scratch`)
  } else if (existsSync(progPath)) {
    const progress = JSON.parse(readFileSync(progPath, 'utf8'))
    offset = Number(progress.offset) || 0
    byId = new Map(
      (progress.games || [])
        .filter((game) => !shouldSkipGame(game))
        .map((game) => [game.id, game]),
    )
    console.log(
      `${platform.name}: resuming at offset ${offset} (${byId.size} games cached)`,
    )
  } else if (existsSync(filePath)) {
    try {
      const existing = JSON.parse(readFileSync(filePath, 'utf8'))
      if (Array.isArray(existing) && existing.length > 0) {
        console.log(
          `${platform.name}: ${platform.file} already complete, skipping.`,
        )
        return
      }
    } catch {
      // rewrite empty/invalid file
    }
  }

  let pagesSinceSave = 0

  for (;;) {
    process.stdout.write(
      `${platform.name}: offset ${offset} (${byId.size.toLocaleString()} kept)… `,
    )

    let page
    try {
      page = await fetchPage(platform.id, offset, apiKey)
      console.log(`got ${page.length}`)
    } catch (error) {
      console.log('failed')
      writeFileSync(
        progPath,
        JSON.stringify({ offset, games: [...byId.values()] }),
        'utf8',
      )
      throw error
    }

    if (page.length === 0) break

    for (const apiGame of page) {
      const mapped = mapGame(apiGame, platform.id)
      if (shouldSkipGame(mapped)) {
        byId.delete(mapped.id)
        continue
      }
      byId.set(mapped.id, mapped)
    }

    offset += page.length
    pagesSinceSave += 1

    if (pagesSinceSave >= SAVE_EVERY_PAGES) {
      writeFileSync(
        progPath,
        JSON.stringify({ offset, games: [...byId.values()] }),
        'utf8',
      )
      pagesSinceSave = 0
      console.log('  saved progress')
    }

    if (page.length < PAGE_SIZE) break
    await sleep(REQUEST_GAP_MS)
  }

  const games = [...byId.values()].sort((a, b) =>
    a.title.localeCompare(b.title),
  )
  dumpCompact(games, filePath)

  if (existsSync(progPath)) {
    writeFileSync(progPath, '', 'utf8')
    try {
      const { unlinkSync } = await import('node:fs')
      unlinkSync(progPath)
    } catch {
      // ignore
    }
  }

  console.log(
    `${platform.name}: wrote ${games.length.toLocaleString()} games → ${platform.file}`,
  )
}

async function main() {
  loadEnvFile()
  const apiKey = process.env.MOBYGAMES_API_KEY?.trim()
  if (!apiKey) {
    console.error('Missing MOBYGAMES_API_KEY in environment or .env')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const wanted = args.filter((arg) => arg !== '--force')
  const targets =
    wanted.length === 0
      ? PLATFORMS
      : PLATFORMS.filter(
          (platform) =>
            wanted.includes(String(platform.id)) ||
            wanted.some((arg) =>
              platform.name.toLowerCase().includes(arg.toLowerCase()),
            ) ||
            wanted.includes(platform.file),
        )

  if (targets.length === 0) {
    console.error('No matching platforms. Try: npm run fetch-games')
    process.exit(1)
  }

  for (const platform of targets) {
    await fetchPlatform(platform, apiKey, { force })
    await sleep(REQUEST_GAP_MS)
  }

  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
