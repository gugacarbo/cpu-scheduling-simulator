import type { Job } from '@/lib/types'
import type { SchedulerContext, SchedulerStrategy } from './base'

function comparePriority(a: Job, b: Job): number {
  if (a.computationTime !== b.computationTime) {
    return a.computationTime - b.computationTime
  }
  if (a.arrival !== b.arrival) {
    return a.arrival - b.arrival
  }
  return a.taskIndex - b.taskIndex
}

function highestPriorityJob(queue: Job[]): Job | null {
  if (queue.length === 0) return null
  return queue.reduce((best, job) => (comparePriority(job, best) < 0 ? job : best))
}

export const priorityRoundRobinStrategy: SchedulerStrategy = {
  name: 'PRR',

  pickNext(ctx: SchedulerContext): Job | null {
    return highestPriorityJob(ctx.readyQueue)
  },

  shouldPreemptOnRelease(ctx: SchedulerContext, incoming: Job): boolean {
    if (!ctx.running) return false
    return comparePriority(incoming, ctx.running) < 0
  },

  onJobSelected(ctx: SchedulerContext): void {
    ctx.sliceQuantumUsed = 0
  },

  getRunDuration(ctx: SchedulerContext): number {
    if (!ctx.running) return 0
    const quantum = ctx.running.quantum
    return quantum - ctx.sliceQuantumUsed
  },
}
