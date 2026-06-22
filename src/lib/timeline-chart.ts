import { getTaskIndex } from '@/lib/colors'
import type { ExecutionSlice, Job, SimulationConfig, TimelineSnapshot } from '@/lib/types'

export interface QueueWaitSegment {
  jobId: string
  taskId: string
  taskIndex: number
  jobIndex: number
  start: number
  end: number
}

export function getJobExecutedDuration(jobId: string, executionLog: ExecutionSlice[]): number {
  let total = 0
  for (const slice of executionLog) {
    if (slice.jobId === jobId) {
      total += slice.end - slice.start
    }
  }
  return total
}

export function getChartEndTime(config: SimulationConfig, jobs: Job[]): number {
  const bounds = [
    config.simulation_time,
    ...jobs.map((job) => job.absoluteDeadline),
    ...jobs.map((job) => job.arrival + job.computationTime),
  ]
  return Math.max(...bounds, 0)
}

export function getChartTickStep(chartEndTime: number): number {
  if (chartEndTime <= 20) return 1
  if (chartEndTime <= 50) return 5
  return 10
}

export function getNextJobArrival(jobs: Job[], job: Job): number | null {
  const next = jobs.find(
    (candidate) => candidate.taskId === job.taskId && candidate.jobIndex === job.jobIndex + 1,
  )
  return next?.arrival ?? null
}

export function capJobVisualEnd(job: Job, end: number, jobs: Job[]): number {
  const nextArrival = getNextJobArrival(jobs, job)
  if (nextArrival === null) return end
  return Math.min(end, nextArrival)
}

export function isJobIncompleteOnChart(
  job: Job,
  executionLog: ExecutionSlice[],
): boolean {
  const executed = getJobExecutedDuration(job.id, executionLog)
  return executed < job.computationTime - 1e-9
}

export function getQueueWaitSegments(
  jobs: Job[],
  snapshots: TimelineSnapshot[],
  simulationTime: number,
): QueueWaitSegment[] {
  const waitStartByJob = new Map<string, number>()
  const segments: QueueWaitSegment[] = []

  const jobById = new Map(jobs.map((job) => [job.id, job]))

  const closeWait = (jobId: string, end: number) => {
    const start = waitStartByJob.get(jobId)
    if (start === undefined || end <= start) return

    const job = jobById.get(jobId)
    if (!job) return

    const cappedEnd = capJobVisualEnd(job, end, jobs)
    if (cappedEnd <= start) {
      waitStartByJob.delete(jobId)
      return
    }

    segments.push({
      jobId: job.id,
      taskId: job.taskId,
      taskIndex: getTaskIndex(job.taskId),
      jobIndex: job.jobIndex,
      start,
      end: cappedEnd,
    })
    waitStartByJob.delete(jobId)
  }

  for (const snapshot of snapshots) {
    const queuedIds = new Set(snapshot.queue.map((job) => job.jobId))

    for (const jobId of [...waitStartByJob.keys()]) {
      if (!queuedIds.has(jobId)) {
        closeWait(jobId, snapshot.time)
      }
    }

    for (const queuedJob of snapshot.queue) {
      if (!waitStartByJob.has(queuedJob.jobId)) {
        waitStartByJob.set(queuedJob.jobId, snapshot.time)
      }
    }
  }

  for (const jobId of [...waitStartByJob.keys()]) {
    closeWait(jobId, simulationTime)
  }

  return segments
}
