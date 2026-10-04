/**
 * Fetch MobyGames cover thumbnails and write them into src/data/*.json.
 *
 * Setup:
 *   1. Get an API key: https://www.mobygames.com/info/api/
 *   2. Set MOBYGAMES_API_KEY in the environment (or a local .env file)
 *   3. Run: npm run fetch-covers
 *
 * The script is resumable: games that already have a `cover` value are skipped.
 * Rate limit: ~1 request/second (MobyGames non-commercial limit).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'src', 'data')
const DATA_FILES = [
  'PlayStation.json',
  'PlayStation_2.json',
  'PlayStation_3.json',
  'PlayStation_4.json',
  'PlayStation_5.json',
  'PlayStation_Vita.json',
]

const API_BASE = 'https://api.mobygames.com/v1/games'
const BATCH_SIZE = 50
const REQUEST_GAP_MS = 1100
const SAVE_EVERY_BATCHES = 5

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
  const lines = games.map((game) =>
    JSON.stringify(game, null, 0),
  )
  writeFileSync(filePath, `[\n  ${lines.join(',\n  ')}\n]\n`, 'utf8')
}

function httpsToSecure(url) {
  if (!url) return null
  return url.replace(/^http:\/\//i, 'https://')
}

function rateLimitWaitMs(message, attempt) {
  const match = String(message).match(/reset in (\d+)\s*seconds/i)
  if (match) return (Number(match[1]) + 15) * 1000
  return Math.min(15000, attempt * 2500)
}

async function fetchGamesBatch(ids, apiKey, attempt = 1) {
  const params = new URLSearchParams()
  params.set('api_key', apiKey)
  params.set('format', 'normal')
  for (const id of ids) params.append('id', String(id))

  const response = await fetch(`${API_BASE}?${params}`)
  const text = await response.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    if (attempt < 8 && (response.status >= 500 || response.status === 429)) {
      const wait = rateLimitWaitMs(text, attempt)
      console.log(`retryable ${response.status}, waiting ${Math.round(wait / 1000)}s…`)
      await sleep(wait)
      return fetchGamesBatch(ids, apiKey, attempt + 1)
    }
    throw new Error(`Invalid JSON (${response.status}): ${text.slice(0, 200)}`)
  }

  if (!response.ok) {
    const message = data?.message || data?.error || text.slice(0, 200)
    if (attempt < 8 && (response.status >= 500 || response.status === 429)) {
      const wait = rateLimitWaitMs(message, attempt)
      console.log(`API ${response.status}, waiting ${Math.round(wait / 1000)}s…`)
      await sleep(wait)
      return fetchGamesBatch(ids, apiKey, attempt + 1)
    }
    throw new Error(`API ${response.status}: ${message}`)
  }

  return Array.isArray(data.games) ? data.games : []
}

function coverFromGame(apiGame) {
  const cover = apiGame?.sample_cover
  return (
    httpsToSecure(cover?.thumbnail_image) ||
    httpsToSecure(cover?.image) ||
    null
  )
}

async function main() {
  loadEnvFile()
  const apiKey = process.env.MOBYGAMES_API_KEY?.trim()
  if (!apiKey) {
    console.error(
      'Missing MOBYGAMES_API_KEY.\n' +
        'Get a key at https://www.mobygames.com/info/api/\n' +
        'Then either:\n' +
        '  set MOBYGAMES_API_KEY=your_key   (PowerShell: $env:MOBYGAMES_API_KEY="your_key")\n' +
        '  or create a .env file with MOBYGAMES_API_KEY=your_key\n' +
        'and run: npm run fetch-covers',
    )
    process.exit(1)
  }

  const datasets = DATA_FILES.map((name) => {
    const filePath = path.join(DATA_DIR, name)
    const games = JSON.parse(readFileSync(filePath, 'utf8'))
    return { name, filePath, games }
  })

  const neededIds = [
    ...new Set(
      datasets.flatMap(({ games }) =>
        games
          .filter((game) => !game.cover)
          .map((game) => game.id),
      ),
    ),
  ]

  console.log(
    `Games missing covers: ${neededIds.length.toLocaleString()} unique IDs`,
  )

  if (neededIds.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const coverById = new Map()
  let batchesSinceSave = 0
  let fetched = 0
  let withCover = 0
  let withoutCover = 0

  for (let i = 0; i < neededIds.length; i += BATCH_SIZE) {
    const batch = neededIds.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(neededIds.length / BATCH_SIZE)

    process.stdout.write(
      `Batch ${batchNumber}/${totalBatches} (${batch.length} ids)… `,
    )

    try {
      const apiGames = await fetchGamesBatch(batch, apiKey)
      const found = new Map(apiGames.map((game) => [game.game_id, game]))

      for (const id of batch) {
        fetched += 1
        const cover = coverFromGame(found.get(id))
        coverById.set(id, cover)
        if (cover) withCover += 1
        else withoutCover += 1
      }

      console.log(`ok (${apiGames.length} returned)`)
    } catch (error) {
      console.log('failed')
      console.error(`  ${error.message}`)
      console.error('Stopping. Re-run npm run fetch-covers to resume.')
      break
    }

    batchesSinceSave += 1
    if (
      batchesSinceSave >= SAVE_EVERY_BATCHES ||
      i + BATCH_SIZE >= neededIds.length
    ) {
      for (const dataset of datasets) {
        let changed = false
        for (const game of dataset.games) {
          if (game.cover || !coverById.has(game.id)) continue
          game.cover = coverById.get(game.id)
          changed = true
        }
        if (changed) dumpCompact(dataset.games, dataset.filePath)
      }
      batchesSinceSave = 0
      console.log('  saved progress')
    }

    if (i + BATCH_SIZE < neededIds.length) {
      await sleep(REQUEST_GAP_MS)
    }
  }

  console.log(
    `Done. Checked ${fetched.toLocaleString()} ids ` +
      `(${withCover.toLocaleString()} with cover, ` +
      `${withoutCover.toLocaleString()} without).`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
