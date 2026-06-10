import type {
  JobMetrics,
  SimulationConfig,
  SimulationResult,
  TaskConfig,
  TimelineSnapshot,
  TimelineSnapshotJob,
} from '@/lib/types'

function formatJobLabel(job: TimelineSnapshotJob): string {
  return `${job.taskId}#${job.jobIndex}`
}

export function buildJobsFinishedByTime(result: SimulationResult): Map<number, JobMetrics[]> {
  const byTime = new Map<number, JobMetrics[]>()
  for (const job of result.jobs) {
    const list = byTime.get(job.finish) ?? []
    list.push(job)
    byTime.set(job.finish, list)
  }
  return byTime
}

export function buildTimelineStateTable(
  config: SimulationConfig,
  result: SimulationResult,
): TimelineSnapshot[] {
  if (result.timelineSnapshots.length === config.simulation_time) {
    return result.timelineSnapshots
  }

  return result.timelineSnapshots.slice(0, config.simulation_time)
}

function getTaskConfigForJob(
  config: SimulationConfig,
  job: TimelineSnapshotJob,
): TaskConfig | undefined {
  return config.tasks.find((task) => task.id === job.taskId)
}

export interface JobProgress {
  percent: number
  elapsed: number
  remaining: number
  total: number
}

interface JobTooltipField {
  label: string
  value: string
}

export interface JobTooltipInfo {
  label: string
  snapshotTime?: number
  progress: JobProgress
  fields: JobTooltipField[]
}

export function getJobProgress(job: TimelineSnapshotJob): JobProgress {
  const total = job.computationTime
  const remaining = Math.max(0, job.remainingTime)
  const elapsed = Math.max(0, total - remaining)
  const percent = total > 0 ? Math.min(100, (elapsed / total) * 100) : 100

  return { percent, elapsed, remaining, total }
}

export function buildJobTooltipInfo(
  config: SimulationConfig,
  job: TimelineSnapshotJob,
  snapshotTime?: number,
): JobTooltipInfo {
  const task = getTaskConfigForJob(config, job)
  const progress = getJobProgress(job)

  const fields: JobTooltipField[] = [
    { label: 'Chegada', value: `t=${job.arrival}` },
    { label: 'Deadline', value: `t=${job.absoluteDeadline}` },
    { label: 'Quantum', value: `${job.quantum}u` },
  ]

  if (task) {
    fields.push(
      { label: 'Offset', value: `${task.offset}u` },
      { label: 'Computação', value: `${task.computation_time}u` },
      { label: 'Período', value: `${task.period_time}u` },
      { label: 'Deadline rel.', value: `${task.deadline}u` },
    )
  }

  return {
    label: formatJobLabel(job),
    snapshotTime,
    progress,
    fields,
  }
}
