export type SchedulerName = 'RR' | 'PRR' | 'RR_PRIORITY' | 'RM' | 'EDF'

export interface TaskConfig {
  id: string
  offset: number
  computation_time: number
  period_time: number
  quantum: number
  deadline: number
}

export interface SimulationConfig {
  simulation_time: number
  scheduler_name: SchedulerName
  tasks: TaskConfig[]
}

export interface Job {
  id: string
  taskId: string
  taskIndex: number
  jobIndex: number
  arrival: number
  absoluteDeadline: number
  computationTime: number
  remainingTime: number
  start?: number
  finish?: number
  terminatedByDeadline?: boolean
  quantum: number
}

export interface ExecutionSlice {
  taskId: string
  jobIndex: number
  jobId: string
  start: number
  end: number
}

export interface TimelineSnapshotJob {
  jobId: string
  taskId: string
  jobIndex: number
  arrival: number
  absoluteDeadline: number
  computationTime: number
  remainingTime: number
  quantum: number
}

export interface TimelineSnapshot {
  time: number
  running: TimelineSnapshotJob | null
  queue: TimelineSnapshotJob[]
}

export interface JobMetrics {
  jobId: string
  taskId: string
  jobIndex: number
  arrival: number
  start: number
  finish: number
  tat: number
  wt: number
  missedDeadline: boolean
}

export interface TaskStats {
  taskId: string
  tatAvg: number
  wtAvg: number
  jobsExecuted: number
  deadlineMissRate?: number
}

export interface SimulationResult {
  scheduler: SchedulerName
  simulationTime: number
  schedulable?: boolean
  schedulabilityNote?: string
  utilization: number
  executionLog: ExecutionSlice[]
  timelineSnapshots: TimelineSnapshot[]
  jobs: JobMetrics[]
  perTaskStats: TaskStats[]
  systemTatAvg: number
  systemWtAvg: number
  maxWtTaskId: string | null
  minWtTaskId: string | null
  starvationTasks: string[]
  deadlineMisses?: {
    perTask: Record<string, number>
    system: number
  }
  logText: string
}
