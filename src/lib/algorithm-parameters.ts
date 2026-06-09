import type { SchedulerName, SimulationConfig, TaskConfig } from '@/lib/types'

export type ParameterKey =
  | 'simulation_time'
  | 'quantum'
  | 'offset'
  | 'computation_time'
  | 'period_time'
  | 'deadline'

export type ParameterScope = 'global' | 'task'

export interface AlgorithmParameter {
  key: ParameterKey
  label: string
  explanation: string
  scope: ParameterScope
}

const RR_PARAMETERS: AlgorithmParameter[] = [
  {
    key: 'simulation_time',
    label: 'simulation_time',
    explanation: 'Duração total da simulação em unidades de tempo.',
    scope: 'global',
  },
  {
    key: 'quantum',
    label: 'quantum',
    explanation: 'Fatia de CPU por tarefa antes de ir ao fim da fila circular.',
    scope: 'task',
  },
  {
    key: 'offset',
    label: 'offset',
    explanation: 'Instante de chegada da primeira instância de cada tarefa.',
    scope: 'task',
  },
  {
    key: 'computation_time',
    label: 'computation_time',
    explanation: 'Tempo de CPU necessário para concluir cada job.',
    scope: 'task',
  },
  {
    key: 'period_time',
    label: 'period_time',
    explanation: 'Intervalo entre gerações sucessivas de jobs periódicos.',
    scope: 'task',
  },
]

const PRR_PARAMETERS: AlgorithmParameter[] = [
  {
    key: 'simulation_time',
    label: 'simulation_time',
    explanation: 'Duração total da simulação em unidades de tempo.',
    scope: 'global',
  },
  {
    key: 'computation_time',
    label: 'computation_time',
    explanation: 'Define prioridade fixa: menor Ci implica maior prioridade na fila.',
    scope: 'task',
  },
  {
    key: 'quantum',
    label: 'quantum',
    explanation: 'Fatia de CPU por tarefa dentro de cada nível de prioridade.',
    scope: 'task',
  },
  {
    key: 'offset',
    label: 'offset',
    explanation: 'Instante de chegada da primeira instância de cada tarefa.',
    scope: 'task',
  },
  {
    key: 'period_time',
    label: 'period_time',
    explanation: 'Intervalo entre gerações sucessivas de jobs periódicos.',
    scope: 'task',
  },
]

const RM_PARAMETERS: AlgorithmParameter[] = [
  {
    key: 'simulation_time',
    label: 'simulation_time',
    explanation: 'Duração total da simulação em unidades de tempo.',
    scope: 'global',
  },
  {
    key: 'period_time',
    label: 'period_time',
    explanation: 'Define prioridade estática: menor período implica maior prioridade.',
    scope: 'task',
  },
  {
    key: 'offset',
    label: 'offset',
    explanation: 'Instante de chegada da primeira instância de cada tarefa.',
    scope: 'task',
  },
  {
    key: 'computation_time',
    label: 'computation_time',
    explanation: 'Tempo de CPU necessário para concluir cada job.',
    scope: 'task',
  },
  {
    key: 'deadline',
    label: 'deadline',
    explanation: 'Prazo relativo de cada job, usado para verificar violações.',
    scope: 'task',
  },
]

const EDF_PARAMETERS: AlgorithmParameter[] = [
  {
    key: 'simulation_time',
    label: 'simulation_time',
    explanation: 'Duração total da simulação em unidades de tempo.',
    scope: 'global',
  },
  {
    key: 'deadline',
    label: 'deadline',
    explanation: 'Define prioridade dinâmica: menor prazo absoluto executa primeiro.',
    scope: 'task',
  },
  {
    key: 'offset',
    label: 'offset',
    explanation: 'Instante de chegada da primeira instância de cada tarefa.',
    scope: 'task',
  },
  {
    key: 'computation_time',
    label: 'computation_time',
    explanation: 'Tempo de CPU necessário para concluir cada job.',
    scope: 'task',
  },
  {
    key: 'period_time',
    label: 'period_time',
    explanation: 'Intervalo entre gerações sucessivas de jobs periódicos.',
    scope: 'task',
  },
]

export const ALGORITHM_PARAMETERS: Record<SchedulerName, AlgorithmParameter[]> = {
  RR: RR_PARAMETERS,
  PRR: PRR_PARAMETERS,
  RR_PRIORITY: PRR_PARAMETERS,
  RM: RM_PARAMETERS,
  EDF: EDF_PARAMETERS,
}

function summarizeNumericValues(values: number[]): string {
  if (values.length === 0) return '—'

  const unique = [...new Set(values)].sort((a, b) => a - b)
  if (unique.length === 1) return `${unique[0]}u`

  const min = unique[0]
  const max = unique[unique.length - 1]
  if (unique.length <= 5) {
    return unique.map((value) => `${value}u`).join(', ')
  }

  return `${min}–${max}u`
}

export function getParameterValue(key: ParameterKey, config: SimulationConfig): string {
  switch (key) {
    case 'simulation_time':
      return `${config.simulation_time}u`
    case 'quantum':
      return summarizeNumericValues(config.tasks.map((task) => task.quantum))
    case 'offset':
      return summarizeNumericValues(config.tasks.map((task) => task.offset))
    case 'computation_time':
      return summarizeNumericValues(config.tasks.map((task) => task.computation_time))
    case 'period_time':
      return summarizeNumericValues(config.tasks.map((task) => task.period_time))
    case 'deadline':
      return summarizeNumericValues(config.tasks.map((task) => task.deadline))
  }
}

export function getAlgorithmParameters(scheduler: SchedulerName): AlgorithmParameter[] {
  return ALGORITHM_PARAMETERS[scheduler]
}

export function getGlobalParameters(scheduler: SchedulerName): AlgorithmParameter[] {
  return getAlgorithmParameters(scheduler).filter((parameter) => parameter.scope === 'global')
}

export function getTaskParameters(scheduler: SchedulerName): AlgorithmParameter[] {
  return getAlgorithmParameters(scheduler).filter((parameter) => parameter.scope === 'task')
}

export function getTaskParameterValue(key: ParameterKey, task: TaskConfig): string {
  switch (key) {
    case 'simulation_time':
      return '—'
    case 'quantum':
      return `${task.quantum}u`
    case 'offset':
      return `${task.offset}u`
    case 'computation_time':
      return `${task.computation_time}u`
    case 'period_time':
      return `${task.period_time}u`
    case 'deadline':
      return `${task.deadline}u`
  }
}
