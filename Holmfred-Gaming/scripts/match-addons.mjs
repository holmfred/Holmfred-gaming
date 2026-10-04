/**
 * Title-match Add-on entries to base games on the same platform.
 * Writes parent_id + parent_title onto add-on records.
 *
 * Run: node scripts/match-addons.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../src/data')
const DATA_FILES = [
  'PlayStation.json',
  'PlayStation_2.json',
  'PlayStation_3.json',
  'PlayStation_4.json',
  'PlayStation_5.json',
  'PlayStation_Vita.json',
]

function isAddon(game) {
  return (game.genres || []).some(
    (genre) => typeof genre === 'string' && /add-?on/i.test(genre),
  )
}

function findParent(addon, bases) {
  const matches = bases
    .filter((game) => {
      const title = game.title
      return (
        addon.title.startsWith(`${title}:`) ||
        addon.title.startsWith(`${title}: `) ||
        addon.title.startsWith(`${title} - `) ||
        addon.title.startsWith(`${title} – `) ||
        addon.title.startsWith(`${title} — `)
      )
    })
    .sort((a, b) => b.title.length - a.title.length)

  return matches[0] ?? null
}

function dumpCompact(games, filePath) {
  const lines = games.map((game) =>
    JSON.stringify(game, null, 0),
  )
  writeFileSync(filePath, `[\n  ${lines.join(',\n  ')}\n]\n`, 'utf8')
}

let totalMatched = 0
let totalUnmatched = 0

for (const name of DATA_FILES) {
  const filePath = path.join(DATA_DIR, name)
  const games = JSON.parse(readFileSync(filePath, 'utf8'))
  const bases = games.filter((game) => !isAddon(game))
  let matched = 0
  let unmatched = 0

  const next = games.map((game) => {
    if (!isAddon(game)) {
      const { parent_id: _pid, parent_title: _pt, ...rest } = game
      return rest
    }

    const parent = findParent(game, bases)
    if (parent) {
      matched += 1
      return {
        ...game,
        parent_id: parent.id,
        parent_title: parent.title,
      }
    }

    unmatched += 1
    return {
      ...game,
      parent_id: null,
      parent_title: null,
    }
  })

  dumpCompact(next, filePath)
  totalMatched += matched
  totalUnmatched += unmatched
  console.log(
    `${name}: add-ons ${matched + unmatched} → matched ${matched}, unmatched ${unmatched}`,
  )
}

console.log(
  `Total: matched ${totalMatched.toLocaleString()}, unmatched ${totalUnmatched.toLocaleString()}`,
)
