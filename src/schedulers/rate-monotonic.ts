import type { Job, SimulationConfig } from '@/lib/types'
import type { SchedulerContext, SchedulerStrategy } from './base'
import { computeUtilization, liuLaylandBound, runSimulation } from './base'

function getTaskPeriod(ctx: SchedulerContext, taskId: string): number {
  const task = ctx.config.tasks.find((item) => item.id === taskId)
  return task?.period_time ?? Infinity
}

function compareRmPriority(a: Job, b: Job, ctx: SchedulerContext): number {
  const periodA = getTaskPeriod(ctx, a.taskId)
  const periodB = getTaskPeriod(ctx, b.taskId)
  if (periodA !== periodB) return periodA - periodB
  if (a.arrival !== b.arrival) return a.arrival - b.arrival
  return a.taskIndex - b.taskIndex
}

function highestPriorityJob(ctx: SchedulerContext): Job | null {
  if (ctx.readyQueue.length === 0) return null
  return ctx.readyQueue.reduce((best, job) => (compareRmPriority(job, best, ctx) < 0 ? job : best))
}

const rateMonotonicStrategy: SchedulerStrategy = {
  name: 'RM',

  pickNext(ctx: SchedulerContext): Job | null {
    return highestPriorityJob(ctx)
  },

  shouldPreemptOnRelease(ctx: SchedulerContext, incoming: Job): boolean {
    if (!ctx.running) return false
    return compareRmPriority(incoming, ctx.running, ctx) < 0
  },

  onJobSelected(): void {},

  getRunDuration(ctx: SchedulerContext): number {
    return ctx.running?.remainingTime ?? 0
  },
}

export function simulateRateMonotonic(config: SimulationConfig) {
  const utilization = computeUtilization(config)
  const n = config.tasks.length
  const bound = liuLaylandBound(n)
  const schedulable = utilization <= bound

  return runSimulation(config, rateMonotonicStrategy, {
    schedulable,
    schedulabilityNote: `Teste de Liu & Layland: U = ${utilization.toFixed(4)} ${
      schedulable ? '<=' : '>'
    } n(2^(1/n)-1) = ${bound.toFixed(4)}. Condição suficiente, não necessária.`,
  })
}
