import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSimulationConfigJson } from '@/lib/schema'
import type { SimulationConfig } from '@/lib/types'
import type { ExpectedOutput } from './normalize-result'

const fixturesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures')

export interface Fixture {
  name: string
  config: SimulationConfig
  expected: ExpectedOutput
  expectedTxt: string
}

function readFixtureFile(fixtureName: string, filename: string): string {
  const filePath = path.join(fixturesRoot, fixtureName, filename)
  return readFileSync(filePath, 'utf-8')
}

export function loadFixture(name: string): Fixture {
  const inputText = readFixtureFile(name, 'input.json')
  const parsed = validateSimulationConfigJson(inputText)

  if (!parsed.success) {
    throw new Error(
      `Fixture "${name}" input.json failed validation:\n${parsed.errors.join('\n')}`,
    )
  }

  const expected = JSON.parse(readFixtureFile(name, 'expected.json')) as ExpectedOutput
  const expectedTxt = readFixtureFile(name, 'expected.txt')

  return {
    name,
    config: parsed.data,
    expected,
    expectedTxt,
  }
}
