import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSimulationConfigJson } from '../src/lib/schema'
import { runSchedulerSimulation } from '../src/schedulers/index'
import { normalizeResult } from '../tests/helpers/normalize-result'

const fixturesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../tests/fixtures')

const fixtureDirs = readdirSync(fixturesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

for (const fixtureName of fixtureDirs) {
  const fixturePath = path.join(fixturesRoot, fixtureName)
  const inputText = readFileSync(path.join(fixturePath, 'input.json'), 'utf-8')
  const parsed = validateSimulationConfigJson(inputText)

  if (!parsed.success) {
    throw new Error(
      `Fixture "${fixtureName}" input.json failed validation:\n${parsed.errors.join('\n')}`,
    )
  }

  const result = runSchedulerSimulation(parsed.data)
  const normalized = normalizeResult(result)

  writeFileSync(path.join(fixturePath, 'expected.json'), `${JSON.stringify(normalized, null, 2)}\n`)
  writeFileSync(path.join(fixturePath, 'expected.txt'), result.logText)

  console.log(`Generated golden files for ${fixtureName}`)
}
