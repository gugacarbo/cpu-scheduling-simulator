import type { Job, SimulationConfig } from '@/lib/types'
import type { SchedulerContext, SchedulerStrategy } from './base'
import { computeUtilization, runSimulation } from './base'

function compareEdfPriority(a: Job, b: Job): number {
  if (a.absoluteDeadline !== b.absoluteDeadline) {
    return a.absoluteDeadline - b.absoluteDeadline
  }
  if (a.arrival !== b.arrival) return a.arrival - b.arrival
  return a.taskIndex - b.taskIndex
}

function highestPriorityJob(queue: Job[]): Job | null {
  if (queue.length === 0) return null
  return queue.reduce((best, job) => (compareEdfPriority(job, best) < 0 ? job : best))
}

export const edfStrategy: SchedulerStrategy = {
  name: 'EDF',

  pickNext(ctx: SchedulerContext): Job | null {
    return highestPriorityJob(ctx.readyQueue)
  },

  shouldPreemptOnRelease(ctx: SchedulerContext, incoming: Job): boolean {
    if (!ctx.running) return false
    return compareEdfPriority(incoming, ctx.running) < 0
  },

  onJobSelected(): void {},

  getRunDuration(ctx: SchedulerContext): number {
    return ctx.running?.remainingTime ?? 0
  },
}

export function simulateEdf(config: SimulationConfig) {
  const utilization = computeUtilization(config)
  const schedulable = utilization <= 1

  return runSimulation(config, edfStrategy, {
    schedulable,
    schedulabilityNote: `Teste de escalonabilidade EDF: U = ${utilization.toFixed(4)} ${
      schedulable ? '<=' : '>'
    } 1. Para EDF preemptivo em uniprocessador, U <= 1 é necessário e suficiente.`,
  })
}
