import type {
  ExecutionSlice,
  Job,
  JobMetrics,
  SimulationConfig,
  SimulationResult,
  TaskStats,
  TimelineSnapshot,
  TimelineSnapshotJob,
} from '@/lib/types'

export interface SchedulerContext {
  config: SimulationConfig
  jobs: Job[]
  readyQueue: Job[]
  running: Job | null
  currentTime: number
  slices: ExecutionSlice[]
  sliceQuantumUsed: number
}

export interface SchedulerStrategy {
  name: string
  pickNext(ctx: SchedulerContext): Job | null
  shouldPreemptOnRelease(ctx: SchedulerContext, incoming: Job): boolean
  onJobSelected(ctx: SchedulerContext, job: Job): void
  getRunDuration(ctx: SchedulerContext): number
}

export function generateJobs(config: SimulationConfig): Job[] {
  const jobs: Job[] = []

  for (const task of config.tasks) {
    let k = 0
    while (true) {
      const arrival = task.offset + k * task.period_time
      if (arrival >= config.simulation_time) break
      if (arrival + task.computation_time > config.simulation_time) break

      jobs.push({
        id: `${task.id}-${k}`,
        taskId: task.id,
        taskIndex: config.tasks.indexOf(task),
        jobIndex: k,
        arrival,
        absoluteDeadline: arrival + task.deadline,
        computationTime: task.computation_time,
        remainingTime: task.computation_time,
        quantum: task.quantum,
      })
      k++
    }
  }

  return jobs.sort((a, b) => a.arrival - b.arrival || a.taskIndex - b.taskIndex)
}

export function computeUtilization(config: SimulationConfig): number {
  return config.tasks.reduce((sum, task) => sum + task.computation_time / task.period_time, 0)
}

function removeFromQueue(queue: Job[], job: Job): Job[] {
  return queue.filter((item) => item.id !== job.id)
}

function addToQueue(queue: Job[], job: Job): Job[] {
  return [...queue, job]
}

const MAX_SIMULATION_ITERATIONS = 1_000_000

interface SnapshotCloneOptions {
  snapshotTime: number
  sliceStart: number
}

function cloneJobForSnapshot(job: Job, runningAdjust?: SnapshotCloneOptions): TimelineSnapshotJob {
  let remainingTime = job.remainingTime
  if (runningAdjust) {
    const elapsed = runningAdjust.snapshotTime - runningAdjust.sliceStart
    remainingTime = Math.max(0, job.remainingTime - elapsed)
  }

  return {
    jobId: job.id,
    taskId: job.taskId,
    jobIndex: job.jobIndex,
    arrival: job.arrival,
    absoluteDeadline: job.absoluteDeadline,
    computationTime: job.computationTime,
    remainingTime,
    quantum: job.quantum,
  }
}

function createSnapshotRecorder(config: SimulationConfig, ctx: SchedulerContext) {
  const snapshots: TimelineSnapshot[] = []
  let nextSnapshotTime = 0

  const fillSnapshotsUpTo = (endTime: number, sliceStart?: number) => {
    const limit = Math.min(endTime, config.simulation_time)
    while (nextSnapshotTime < limit) {
      const runningAdjust =
        ctx.running && sliceStart !== undefined
          ? { snapshotTime: nextSnapshotTime, sliceStart }
          : undefined

      snapshots.push({
        time: nextSnapshotTime,
        running: ctx.running ? cloneJobForSnapshot(ctx.running, runningAdjust) : null,
        queue: ctx.readyQueue.map((job) => cloneJobForSnapshot(job)),
      })
      nextSnapshotTime++
    }
  }

  return { snapshots, fillSnapshotsUpTo }
}

export function runSimulation(
  config: SimulationConfig,
  strategy: SchedulerStrategy,
  extras?: Partial<Pick<SimulationResult, 'schedulable' | 'schedulabilityNote'>>,
): Omit<SimulationResult, 'logText'> {
  const allJobs = generateJobs(config)
  const releases = [...allJobs]
  let releaseIndex = 0
  let iterations = 0

  const ctx: SchedulerContext = {
    config,
    jobs: allJobs,
    readyQueue: [],
    running: null,
    currentTime: 0,
    slices: [],
    sliceQuantumUsed: 0,
  }

  const { snapshots, fillSnapshotsUpTo } = createSnapshotRecorder(config, ctx)

  const nextReleaseTime = (): number =>
    releaseIndex < releases.length ? releases[releaseIndex].arrival : Infinity

  while (
    ctx.currentTime < config.simulation_time ||
    ctx.running !== null ||
    ctx.readyQueue.length > 0 ||
    releaseIndex < releases.length
  ) {
    iterations++
    if (iterations > MAX_SIMULATION_ITERATIONS) {
      throw new Error(
        `Simulation exceeded ${MAX_SIMULATION_ITERATIONS} iterations at t=${ctx.currentTime}`,
      )
    }
    while (releaseIndex < releases.length && releases[releaseIndex].arrival <= ctx.currentTime) {
      const incoming = releases[releaseIndex]
      releaseIndex++

      if (ctx.running && strategy.shouldPreemptOnRelease(ctx, incoming)) {
        ctx.readyQueue = addToQueue(ctx.readyQueue, ctx.running)
        ctx.running = null
        ctx.sliceQuantumUsed = 0
      }

      ctx.readyQueue = addToQueue(ctx.readyQueue, incoming)
    }

    if (!ctx.running) {
      const next = strategy.pickNext(ctx)
      if (next) {
        ctx.readyQueue = removeFromQueue(ctx.readyQueue, next)
        ctx.running = next
        if (next.start === undefined) {
          next.start = ctx.currentTime
        }
        strategy.onJobSelected(ctx, next)
      }
    }

    if (!ctx.running) {
      if (releaseIndex >= releases.length) {
        fillSnapshotsUpTo(config.simulation_time)
        break
      }
      const nextRelease = nextReleaseTime()
      fillSnapshotsUpTo(nextRelease)
      ctx.currentTime = nextRelease
      continue
    }

    const runDuration = strategy.getRunDuration(ctx)
    const nextRelease = nextReleaseTime()
    const timeLeft = config.simulation_time - ctx.currentTime
    const duration = Math.min(runDuration, nextRelease - ctx.currentTime, timeLeft)

    if (duration <= 0) {
      if (ctx.currentTime >= config.simulation_time) {
        fillSnapshotsUpTo(config.simulation_time)
        break
      }
      const nextEvent = Math.min(nextRelease, config.simulation_time)
      if (nextEvent > ctx.currentTime) {
        fillSnapshotsUpTo(nextEvent)
        ctx.currentTime = nextEvent
        continue
      }
      fillSnapshotsUpTo(config.simulation_time)
      break
    }

    const running = ctx.running
    const sliceStart = ctx.currentTime
    const sliceEnd = sliceStart + duration
    fillSnapshotsUpTo(sliceEnd, sliceStart)

    ctx.slices.push({
      taskId: running.taskId,
      jobIndex: running.jobIndex,
      jobId: running.id,
      start: ctx.currentTime,
      end: sliceEnd,
    })

    running.remainingTime -= duration
    ctx.sliceQuantumUsed += duration
    ctx.currentTime = sliceEnd

    if (running.remainingTime <= 1e-9) {
      running.finish = ctx.currentTime
      running.remainingTime = 0
      ctx.running = null
      ctx.sliceQuantumUsed = 0
      continue
    }

    if (ctx.sliceQuantumUsed >= running.quantum - 1e-9) {
      ctx.readyQueue = addToQueue(ctx.readyQueue, running)
      ctx.running = null
      ctx.sliceQuantumUsed = 0
    }
  }

  fillSnapshotsUpTo(config.simulation_time)

  const utilization = computeUtilization(config)
  const jobMetrics = buildJobMetrics(allJobs)
  const perTaskStats = buildPerTaskStats(config, jobMetrics)
  const systemTatAvg =
    jobMetrics.length > 0
      ? jobMetrics.reduce((sum, job) => sum + job.tat, 0) / jobMetrics.length
      : 0
  const systemWtAvg =
    jobMetrics.length > 0 ? jobMetrics.reduce((sum, job) => sum + job.wt, 0) / jobMetrics.length : 0

  const wtByTask = perTaskStats.filter((stat) => stat.jobsExecuted > 0)
  const maxWtTaskId =
    wtByTask.length > 0
      ? wtByTask.reduce((max, stat) => (stat.wtAvg >= max.wtAvg ? stat : max)).taskId
      : null
  const minWtTaskId =
    wtByTask.length > 0
      ? wtByTask.reduce((min, stat) => (stat.wtAvg <= min.wtAvg ? stat : min)).taskId
      : null

  const starvationTasks = detectStarvation(config, allJobs, ctx.slices)
  const deadlineMisses = buildDeadlineMisses(jobMetrics)

  return {
    scheduler: config.scheduler_name,
    simulationTime: config.simulation_time,
    utilization,
    executionLog: ctx.slices,
    timelineSnapshots: snapshots,
    jobs: jobMetrics,
    perTaskStats,
    systemTatAvg,
    systemWtAvg,
    maxWtTaskId,
    minWtTaskId,
    starvationTasks,
    deadlineMisses,
    ...extras,
  }
}

function hasStartAndFinish(job: Job): job is Job & { start: number; finish: number } {
  return job.finish !== undefined && job.start !== undefined
}

function buildJobMetrics(jobs: Job[]): JobMetrics[] {
  return jobs.filter(hasStartAndFinish).map((job) => {
    const { finish, start } = job
    const tat = finish - job.arrival
    const wt = tat - job.computationTime
    return {
      jobId: job.id,
      taskId: job.taskId,
      jobIndex: job.jobIndex,
      arrival: job.arrival,
      start,
      finish,
      tat,
      wt,
      missedDeadline: finish > job.absoluteDeadline,
    }
  })
}

function buildPerTaskStats(config: SimulationConfig, jobMetrics: JobMetrics[]): TaskStats[] {
  return config.tasks.map((task) => {
    const taskJobs = jobMetrics.filter((job) => job.taskId === task.id)
    const allJobsForTask = generateJobs(config).filter((job) => job.taskId === task.id)
    const tatAvg =
      taskJobs.length > 0 ? taskJobs.reduce((sum, job) => sum + job.tat, 0) / taskJobs.length : 0
    const wtAvg =
      taskJobs.length > 0 ? taskJobs.reduce((sum, job) => sum + job.wt, 0) / taskJobs.length : 0
    const missed = taskJobs.filter((job) => job.missedDeadline).length
    const deadlineMissRate = allJobsForTask.length > 0 ? (missed / allJobsForTask.length) * 100 : 0

    return {
      taskId: task.id,
      tatAvg,
      wtAvg,
      jobsExecuted: taskJobs.length,
      deadlineMissRate,
    }
  })
}

function buildDeadlineMisses(jobMetrics: JobMetrics[]) {
  if (jobMetrics.length === 0) {
    return { perTask: {}, system: 0 }
  }

  const perTask: Record<string, number> = {}
  let totalMissed = 0

  for (const job of jobMetrics) {
    if (job.missedDeadline) {
      perTask[job.taskId] = (perTask[job.taskId] ?? 0) + 1
      totalMissed++
    }
  }

  return {
    perTask,
    system: (totalMissed / jobMetrics.length) * 100,
  }
}

function detectStarvation(
  config: SimulationConfig,
  allJobs: Job[],
  slices: ExecutionSlice[],
): string[] {
  const cpuTimeByTask = new Map<string, number>()
  for (const slice of slices) {
    cpuTimeByTask.set(
      slice.taskId,
      (cpuTimeByTask.get(slice.taskId) ?? 0) + (slice.end - slice.start),
    )
  }

  const starved: string[] = []
  for (const task of config.tasks) {
    const releasedJobs = allJobs.filter((job) => job.taskId === task.id)
    if (releasedJobs.length === 0) continue
    const cpuTime = cpuTimeByTask.get(task.id) ?? 0
    if (cpuTime === 0) {
      starved.push(task.id)
    }
  }

  return starved
}

export function liuLaylandBound(n: number): number {
  if (n <= 0) return 0
  return n * (2 ** (1 / n) - 1)
}
