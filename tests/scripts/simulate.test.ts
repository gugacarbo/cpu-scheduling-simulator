import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildLogFilename } from '@/lib/log-formatter'
import type { SchedulerName } from '@/lib/types'
import { parseArgs, runCliSimulation } from '../../scripts/simulate'
import { loadFixture } from '../helpers/fixture-loader'

const tmpBase = mkdtempSync(path.join('/tmp', 'simulate-test-'))

function makeInputFile(name: string, content: string): string {
  const filePath = path.join(tmpBase, name)
  writeFileSync(filePath, content, 'utf-8')
  return filePath
}

afterAll(() => {
  rmSync(tmpBase, { recursive: true, force: true })
})

describe('parseArgs', () => {
  it('retorna help para -h e --help', () => {
    expect(parseArgs(['-h'])).toBe('help')
    expect(parseArgs(['--help'])).toBe('help')
  })

  it('exige arquivo de entrada', () => {
    expect(parseArgs([])).toBeNull()
  })

  it('rejeita múltiplos arquivos de entrada', () => {
    expect(() => parseArgs(['a.json', 'b.json'])).toThrow('apenas um arquivo de entrada')
  })

  it('rejeita opção desconhecida', () => {
    expect(() => parseArgs(['input.json', '--foo'])).toThrow('Opção desconhecida: --foo')
  })

  it('parseia caminho de entrada e saída', () => {
    const result = parseArgs(['input.json', '-o', 'out.txt'])
    expect(result).not.toBe('help')
    expect(result).not.toBeNull()
    if (result !== 'help' && result !== null) {
      expect(result.inputPath).toBe('input.json')
      expect(result.outputPath).toBe('out.txt')
      expect(result.scheduler).toBeNull()
    }
  })

  it('ignora separador --', () => {
    const result = parseArgs(['--', 'input.json', '--output', 'out.txt'])
    expect(result).not.toBe('help')
    expect(result).not.toBeNull()
    if (result !== 'help' && result !== null) {
      expect(result.inputPath).toBe('input.json')
      expect(result.outputPath).toBe('out.txt')
    }
  })

  it('parseia scheduler override', () => {
    const result = parseArgs(['input.json', '-s', 'EDF'])
    expect(result).not.toBe('help')
    expect(result).not.toBeNull()
    if (result !== 'help' && result !== null) {
      expect(result.scheduler).toBe('EDF')
    }
  })

  it('normaliza RR_PRIORITY para PRR', () => {
    const result = parseArgs(['input.json', '-s', 'RR_PRIORITY'])
    expect(result).not.toBe('help')
    expect(result).not.toBeNull()
    if (result !== 'help' && result !== null) {
      expect(result.scheduler).toBe('PRR')
    }
  })

  it('rejeita --output sem valor', () => {
    expect(() => parseArgs(['input.json', '-o'])).toThrow('--output requer um caminho')
  })

  it('rejeita --scheduler sem valor', () => {
    expect(() => parseArgs(['input.json', '-s'])).toThrow('--scheduler requer um nome')
  })
})

describe('runCliSimulation', () => {
  const CASES: { fixture: string; expectedScheduler: SchedulerName }[] = [
    { fixture: 'rr-three-tasks', expectedScheduler: 'RR' },
    { fixture: 'edf-deadline-miss', expectedScheduler: 'EDF' },
    { fixture: 'rm-schedulable', expectedScheduler: 'RM' },
    { fixture: 'prr-priority-preempt', expectedScheduler: 'PRR' },
  ]

  it.each(CASES)('gera LOG idêntico ao fixture $fixture', ({ fixture, expectedScheduler }) => {
    const { config, expectedTxt } = loadFixture(fixture)
    const inputText = JSON.stringify(
      {
        simulation_time: config.simulation_time,
        scheduler_name: config.scheduler_name,
        tasks: config.tasks.map(({ id: _id, ...task }) => task),
      },
      null,
      2,
    )
    const inputPath = makeInputFile(`${fixture}.json`, inputText)
    const outputPath = path.join(tmpBase, `${fixture}-out.txt`)

    const result = runCliSimulation({
      inputPath,
      outputPath,
      scheduler: null,
    })

    expect(result.status).toBe('success')
    expect(result.exitCode).toBe(0)
    expect(result.outputPath).toBe(outputPath)
    expect(result.logText).toBe(expectedTxt)
    expect(readFileSync(outputPath, 'utf-8')).toBe(expectedTxt)
    expect(result.logText).toContain(`Algoritmo: ${expectedScheduler}`)
  })

  it('sobrescreve o scheduler do JSON', () => {
    const { config, expectedTxt } = loadFixture('rr-three-tasks')
    const inputText = JSON.stringify(
      {
        simulation_time: config.simulation_time,
        scheduler_name: 'EDF',
        tasks: config.tasks.map(({ id: _id, ...task }) => task),
      },
      null,
      2,
    )
    const inputPath = makeInputFile('override.json', inputText)
    const outputPath = path.join(tmpBase, 'override-out.txt')

    const result = runCliSimulation({
      inputPath,
      outputPath,
      scheduler: 'RR',
    })

    expect(result.status).toBe('success')
    expect(result.exitCode).toBe(0)
    expect(result.outputPath).toBe(outputPath)
    expect(result.logText).toBe(expectedTxt)
    expect(result.logText).toContain('Algoritmo: RR')
  })

  it('usa nome padrão quando outputPath é null', () => {
    const { config } = loadFixture('rr-three-tasks')
    const inputText = JSON.stringify(
      {
        simulation_time: config.simulation_time,
        scheduler_name: 'RR',
        tasks: config.tasks.map(({ id: _id, ...task }) => task),
      },
      null,
      2,
    )
    const inputPath = makeInputFile('default.json', inputText)

    const result = runCliSimulation({
      inputPath,
      outputPath: null,
      scheduler: null,
    })

    expect(result.status).toBe('success')
    expect(result.exitCode).toBe(0)
    const defaultOutputPath = result.outputPath
    expect(defaultOutputPath).toBeDefined()
    if (defaultOutputPath) {
      expect(path.basename(defaultOutputPath)).toBe(buildLogFilename('RR'))
      expect(result.logText).toContain('Algoritmo: RR')
      rmSync(defaultOutputPath, { force: true })
    }
  })

  it('retorna erro se o JSON é inválido', () => {
    const inputPath = makeInputFile('invalid.json', '{ not json }')

    const result = runCliSimulation({
      inputPath,
      outputPath: path.join(tmpBase, 'invalid-out.txt'),
      scheduler: null,
    })

    expect(result.status).toBe('error')
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('JSON inválido')
  })

  it('retorna erro quando o arquivo de entrada não existe', () => {
    const result = runCliSimulation({
      inputPath: path.join(tmpBase, 'missing.json'),
      outputPath: path.join(tmpBase, 'missing-out.txt'),
      scheduler: null,
    })

    expect(result.status).toBe('error')
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('não foi possível ler o arquivo')
  })
})
