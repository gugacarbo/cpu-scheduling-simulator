import type { SchedulerName, TaskConfig } from '@/lib/types'

export type ParameterKey =
  | 'simulation_time'
  | 'quantum'
  | 'offset'
  | 'computation_time'
  | 'period_time'
  | 'deadline'

type ParameterScope = 'global' | 'task'

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

const ALGORITHM_PARAMETERS: Record<SchedulerName, AlgorithmParameter[]> = {
  RR: RR_PARAMETERS,
  PRR: PRR_PARAMETERS,
  RR_PRIORITY: PRR_PARAMETERS,
  RM: RM_PARAMETERS,
  EDF: EDF_PARAMETERS,
}

const TASK_PARAMETER_DISPLAY_ORDER: ParameterKey[] = [
  'computation_time',
  'offset',
  'deadline',
  'period_time',
  'quantum',
]

function getAlgorithmParameters(scheduler: SchedulerName): AlgorithmParameter[] {
  return ALGORITHM_PARAMETERS[scheduler]
}

export function getTaskParameters(scheduler: SchedulerName): AlgorithmParameter[] {
  const order = new Map(TASK_PARAMETER_DISPLAY_ORDER.map((key, index) => [key, index]))
  return getAlgorithmParameters(scheduler)
    .filter((parameter) => parameter.scope === 'task')
    .sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99))
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
