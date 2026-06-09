import { isRealtimeScheduler } from './colors'
import type { SimulationConfig, SimulationResult } from './types'

function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits)
}

function formatExecutionSequence(result: Pick<SimulationResult, 'executionLog'>): string {
  return result.executionLog
    .map((slice) => `${slice.taskId}(job#${slice.jobIndex}) [${slice.start}, ${slice.end})`)
    .join(' -> ')
}

export function formatSimulationLog(
  config: SimulationConfig,
  result: Omit<SimulationResult, 'logText'>,
): string {
  const lines: string[] = []
  const scheduler = result.scheduler
  const isRealtime = isRealtimeScheduler(scheduler)

  lines.push('=== SIMULADOR DE ESCALONAMENTO ===')
  lines.push(`Algoritmo: ${scheduler}`)
  lines.push(`Tempo de simulação: ${config.simulation_time} unidades`)
  lines.push(`Número de tarefas: ${config.tasks.length}`)
  lines.push('')

  if (isRealtime) {
    lines.push('=== TESTE DE ESCALONABILIDADE ===')
    lines.push(
      `Resultado: ${result.schedulable ? 'ESCALONÁVEL (teste analítico)' : 'NÃO ESCALONÁVEL (teste analítico)'}`,
    )
    if (result.schedulabilityNote) {
      lines.push(result.schedulabilityNote)
    }
    lines.push('')
  }

  lines.push('=== SEQUÊNCIA DE EXECUÇÃO ===')
  lines.push(formatExecutionSequence(result) || 'Nenhuma execução registrada.')
  lines.push('')

  if (isRealtime && result.deadlineMisses) {
    lines.push('=== PERDAS DE DEADLINE ===')
    const hasMisses = Object.keys(result.deadlineMisses.perTask).length > 0
    if (!hasMisses) {
      lines.push('Nenhuma perda de deadline registrada.')
    } else {
      for (const task of config.tasks) {
        const totalJobs = result.jobs.filter((job) => job.taskId === task.id).length
        const missed = result.deadlineMisses.perTask[task.id] ?? 0
        const rate = totalJobs > 0 ? (missed / totalJobs) * 100 : 0
        lines.push(`${task.id}: ${formatNumber(rate)}% de perdas (${missed}/${totalJobs} jobs)`)
      }
      lines.push(
        `Sistema: ${formatNumber(result.deadlineMisses.system)}% de perdas no total de jobs executados`,
      )
    }
    lines.push('')
  }

  lines.push('=== UTILIZAÇÃO DO SISTEMA ===')
  lines.push(`U = ${formatNumber(result.utilization, 4)}`)
  lines.push('')

  lines.push('=== TURNAROUND TIME (TAT) ===')
  for (const stat of result.perTaskStats) {
    lines.push(`${stat.taskId}: TAT_avg^n = ${formatNumber(stat.tatAvg)}`)
  }
  lines.push(`Sistema: TAT_avg = ${formatNumber(result.systemTatAvg)}`)
  lines.push('')

  lines.push('=== WAITING TIME (WT) ===')
  for (const stat of result.perTaskStats) {
    lines.push(`${stat.taskId}: WT_avg^n = ${formatNumber(stat.wtAvg)}`)
  }
  lines.push(`Sistema: WT_avg = ${formatNumber(result.systemWtAvg)}`)
  lines.push('')

  lines.push('=== MAIORES E MENORES WT MÉDIOS ===')
  lines.push(
    `Maior WT médio: ${result.maxWtTaskId ?? 'N/A'}${
      result.maxWtTaskId
        ? ` (${formatNumber(result.perTaskStats.find((s) => s.taskId === result.maxWtTaskId)?.wtAvg ?? 0)})`
        : ''
    }`,
  )
  lines.push(
    `Menor WT médio: ${result.minWtTaskId ?? 'N/A'}${
      result.minWtTaskId
        ? ` (${formatNumber(result.perTaskStats.find((s) => s.taskId === result.minWtTaskId)?.wtAvg ?? 0)})`
        : ''
    }`,
  )
  lines.push('')

  lines.push('=== STARVATION ===')
  if (result.starvationTasks.length === 0) {
    lines.push('Nenhuma tarefa sofreu starvation.')
  } else {
    lines.push(`Tarefas com starvation: ${result.starvationTasks.join(', ')}`)
  }

  return lines.join('\n')
}

export function buildLogFilename(scheduler: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `log_${scheduler}_${date}.txt`
}
