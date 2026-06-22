import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildLogFilename } from '@/lib/log-formatter'
import { resolveSchedulerName, validateSimulationConfigJson } from '@/lib/schema'
import type { SchedulerName, SimulationConfig } from '@/lib/types'
import { runSchedulerSimulation } from '@/schedulers/index'

export const SCHEDULER_NAMES = ['RR', 'PRR', 'RR_PRIORITY', 'RM', 'EDF'] as const

export function printHelp(): string {
  const schedulers = SCHEDULER_NAMES.join(', ')
  return `Uso: simulate <entrada.json> [opções]

Executa a simulação de escalonamento e gera o LOG em TXT.

Argumentos:
  entrada.json          Arquivo de configuração no formato da atividade

Opções:
  -o, --output <arquivo>    Caminho do LOG de saída (padrão: log_<algoritmo>_<data>.txt)
  -s, --scheduler <nome>    Substitui scheduler_name do JSON (${schedulers})
  -h, --help                Exibe esta ajuda

Exemplos:
  simulate public/examples/rr-example.json
  simulate entrada.json -o saida.txt
  simulate entrada.json -s EDF -o log_edf.txt
`
}

export interface CliOptions {
  inputPath: string
  outputPath: string | null
  scheduler: SchedulerName | null
}

export function parseArgs(argv: string[]): CliOptions | 'help' | null {
  const positional: string[] = []
  let outputPath: string | null = null
  let scheduler: SchedulerName | null = null
  const args = argv.filter((arg) => arg !== '--')
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '-h' || arg === '--help') {
      return 'help'
    }

    if (arg === '-o' || arg === '--output') {
      const value = args[++i]
      if (!value) {
        throw new Error('Opção --output requer um caminho de arquivo.')
      }
      outputPath = value
      continue
    }

    if (arg === '-s' || arg === '--scheduler') {
      const value = args[++i]
      if (!value) {
        throw new Error('Opção --scheduler requer um nome de algoritmo.')
      }
      scheduler = resolveSchedulerName(value)
      continue
    }

    if (arg.startsWith('-')) {
      throw new Error(`Opção desconhecida: ${arg}`)
    }

    positional.push(arg)
  }

  if (positional.length === 0) {
    return null
  }

  if (positional.length > 1) {
    throw new Error('Informe apenas um arquivo de entrada.')
  }

  return {
    inputPath: positional[0],
    outputPath,
    scheduler,
  }
}

export interface CliResult {
  status: 'success' | 'help' | 'error'
  exitCode: number
  stdout: string
  stderr: string
  outputPath?: string
  logText?: string
}

export interface SimulationOptions {
  inputPath: string
  outputPath?: string | null
  scheduler?: SchedulerName | null
  cwd?: string
}

function resolveConfig(
  rawConfig: unknown,
  schedulerOverride: SchedulerName | null,
): SimulationConfig {
  if (typeof rawConfig !== 'object' || rawConfig === null) {
    throw new Error('o JSON de entrada deve ser um objeto')
  }

  const configObj = rawConfig as Record<string, unknown>
  const resolvedName =
    schedulerOverride ??
    resolveSchedulerName(String((rawConfig as { scheduler_name?: string }).scheduler_name ?? 'RR'))

  const withScheduler = {
    ...configObj,
    scheduler_name: resolvedName,
  }

  const validated = validateSimulationConfigJson(JSON.stringify(withScheduler))
  if (!validated.success) {
    throw new Error(`validação:\n${validated.errors.map((e) => `  - ${e}`).join('\n')}`)
  }

  return validated.data
}

export function runCliSimulation(options: SimulationOptions): CliResult {
  const cwd = options.cwd ?? process.cwd()
  const inputPath = path.resolve(cwd, options.inputPath)

  let rawJson: string
  try {
    rawJson = readFileSync(inputPath, 'utf-8')
  } catch {
    return {
      status: 'error',
      exitCode: 1,
      stdout: '',
      stderr: `Erro: não foi possível ler o arquivo "${options.inputPath}".\n`,
    }
  }

  let rawConfig: unknown
  try {
    rawConfig = JSON.parse(rawJson) as unknown
  } catch {
    return {
      status: 'error',
      exitCode: 1,
      stdout: '',
      stderr: 'Erro: JSON inválido no arquivo de entrada.\n',
    }
  }

  let config: SimulationConfig
  try {
    config = resolveConfig(rawConfig, options.scheduler ?? null)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { status: 'error', exitCode: 1, stdout: '', stderr: `Erro de ${message}\n` }
  }

  const result = runSchedulerSimulation(config)
  const outputPath = options.outputPath ?? path.resolve(cwd, buildLogFilename(result.scheduler))

  writeFileSync(outputPath, result.logText, 'utf-8')

  return {
    status: 'success',
    exitCode: 0,
    stdout: `LOG gerado em ${outputPath}\n`,
    stderr: '',
    outputPath,
    logText: result.logText,
  }
}

export function runCli(argv: string[], cwd: string): CliResult {
  let options: CliOptions | 'help' | null

  try {
    options = parseArgs(argv)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { status: 'error', exitCode: 1, stdout: '', stderr: `Erro: ${message}\n` }
  }

  if (options === 'help') {
    return { status: 'help', exitCode: 0, stdout: printHelp(), stderr: '' }
  }

  if (!options) {
    return { status: 'error', exitCode: 1, stdout: printHelp(), stderr: '' }
  }

  return runCliSimulation({
    inputPath: options.inputPath,
    outputPath: options.outputPath,
    scheduler: options.scheduler,
    cwd,
  })
}

export function main(): void {
  const result = runCli(process.argv.slice(2), process.cwd())
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  process.exit(result.exitCode)
}

const entryPath = process.argv[1] ?? ''
const modulePath = fileURLToPath(import.meta.url)
if (entryPath === modulePath || path.resolve(entryPath) === path.resolve(modulePath)) {
  main()
}
