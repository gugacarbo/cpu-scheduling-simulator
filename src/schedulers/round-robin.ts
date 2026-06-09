import type { Job } from '@/lib/types'
import type { SchedulerContext, SchedulerStrategy } from './base'

export const roundRobinStrategy: SchedulerStrategy = {
  name: 'RR',

  pickNext(ctx: SchedulerContext): Job | null {
    if (ctx.readyQueue.length === 0) return null
    return ctx.readyQueue[0]
  },

  shouldPreemptOnRelease(): boolean {
    return false
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
