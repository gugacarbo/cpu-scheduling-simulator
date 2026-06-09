import { formatSimulationLog } from '@/lib/log-formatter'
import type { SimulationConfig, SimulationResult } from '@/lib/types'
import { runSimulation } from './base'
import { simulateEdf } from './edf'
import { priorityRoundRobinStrategy } from './priority-rr'
import { simulateRateMonotonic } from './rate-monotonic'
import { roundRobinStrategy } from './round-robin'

export function runSchedulerSimulation(config: SimulationConfig): SimulationResult {
  let partial: Omit<SimulationResult, 'logText'>

  switch (config.scheduler_name) {
    case 'RR':
      partial = runSimulation(config, roundRobinStrategy)
      break
    case 'PRR':
      partial = runSimulation(config, priorityRoundRobinStrategy)
      break
    case 'RM':
      partial = simulateRateMonotonic(config)
      break
    case 'EDF':
      partial = simulateEdf(config)
      break
    default:
      partial = runSimulation(config, roundRobinStrategy)
  }

  return {
    ...partial,
    logText: formatSimulationLog(config, partial),
  }
}

export const SCHEDULER_OPTIONS = [
  { value: 'RR', label: 'Round Robin (RR)' },
  { value: 'PRR', label: 'RR Prioridade (PRR)' },
  { value: 'RM', label: 'Rate Monotonic (RM)' },
  { value: 'EDF', label: 'Earliest Deadline First (EDF)' },
] as const
