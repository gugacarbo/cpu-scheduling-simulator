import type { ExecutionSlice, SchedulerName, SimulationResult, TaskStats } from '@/lib/types'

export interface ExpectedOutput {
  scheduler: SchedulerName
  schedulable?: boolean
  utilization: number
  executionLog: ExecutionSlice[]
  systemTatAvg: number
  systemWtAvg: number
  maxWtTaskId: string | null
  minWtTaskId: string | null
  starvationTasks: string[]
  perTaskStats: TaskStats[]
  deadlineMisses?: {
    perTask: Record<string, number>
    system: number
  }
}

const FLOAT_DECIMALS = 6

function roundFloat(value: number): number {
  const factor = 10 ** FLOAT_DECIMALS
  return Math.round(value * factor) / factor
}

export function normalizeResult(result: Omit<SimulationResult, 'logText'>): ExpectedOutput {
  return {
    scheduler: result.scheduler,
    schedulable: result.schedulable,
    utilization: roundFloat(result.utilization),
    executionLog: result.executionLog,
    systemTatAvg: roundFloat(result.systemTatAvg),
    systemWtAvg: roundFloat(result.systemWtAvg),
    maxWtTaskId: result.maxWtTaskId,
    minWtTaskId: result.minWtTaskId,
    starvationTasks: result.starvationTasks,
    perTaskStats: result.perTaskStats.map((stat) => ({
      ...stat,
      tatAvg: roundFloat(stat.tatAvg),
      wtAvg: roundFloat(stat.wtAvg),
      ...(stat.deadlineMissRate !== undefined
        ? { deadlineMissRate: roundFloat(stat.deadlineMissRate) }
        : {}),
    })),
    ...(result.deadlineMisses !== undefined ? { deadlineMisses: result.deadlineMisses } : {}),
  }
}
