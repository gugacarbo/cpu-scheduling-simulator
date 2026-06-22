import { AlertTriangle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getTaskColor, getTaskIndex } from '@/lib/colors'
import {
  capJobVisualEnd,
  getChartEndTime,
  getChartTickStep,
  getJobExecutedDuration,
  getQueueWaitSegments,
  isJobIncompleteOnChart,
} from '@/lib/timeline-chart'
import {
  getMergedExecutionSegments,
  handleTimelineHoverLeave,
  TIMELINE_HOVER_ZONE_ATTR,
  type ResolvedTimelineHighlight,
  type TimelineHoverState,
} from '@/lib/timeline-hover'
import type { SimulationConfig, SimulationResult } from '@/lib/types'
import { cn } from '@/lib/utils'
import { generateJobs } from '@/schedulers/base'

const ROW_HEIGHT = 36
const LABEL_WIDTH = 48
const CHART_PADDING = 16
const MIN_JOB_LABEL_WIDTH_PX = 14

interface JobLabelCandidate {
  key: string
  jobId: string
  start: number
  end: number
  /** Higher priority wins when segments overlap (execution > wait > planned). */
  priority: number
}

function segmentsOverlap(
  a: Pick<JobLabelCandidate, 'start' | 'end'>,
  b: Pick<JobLabelCandidate, 'start' | 'end'>,
): boolean {
  return a.start < b.end && b.start < a.end
}

function clusterOverlappingCandidates(candidates: JobLabelCandidate[]): JobLabelCandidate[][] {
  const clusters: JobLabelCandidate[][] = []

  for (const candidate of candidates) {
    const overlappingIndices: number[] = []
    for (let index = 0; index < clusters.length; index++) {
      if (clusters[index].some((other) => segmentsOverlap(candidate, other))) {
        overlappingIndices.push(index)
      }
    }

    if (overlappingIndices.length === 0) {
      clusters.push([candidate])
      continue
    }

    const merged = [candidate]
    for (const index of overlappingIndices.sort((a, b) => b - a)) {
      merged.push(...clusters[index])
      clusters.splice(index, 1)
    }
    clusters.push(merged)
  }

  return clusters
}

function pickBestLabelCandidate(candidates: JobLabelCandidate[]): JobLabelCandidate {
  return [...candidates].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority
    if (a.start !== b.start) return a.start - b.start
    return b.end - b.start - (a.end - a.start)
  })[0]
}

function getJobLabelKeys(
  candidates: JobLabelCandidate[],
  pixelsPerUnit: number,
): Set<string> {
  const byJob = new Map<string, JobLabelCandidate[]>()

  for (const candidate of candidates) {
    const widthPx = (candidate.end - candidate.start) * pixelsPerUnit
    if (widthPx < MIN_JOB_LABEL_WIDTH_PX) continue

    const list = byJob.get(candidate.jobId) ?? []
    list.push(candidate)
    byJob.set(candidate.jobId, list)
  }

  const keys = new Set<string>()

  for (const list of byJob.values()) {
    for (const cluster of clusterOverlappingCandidates(list)) {
      keys.add(pickBestLabelCandidate(cluster).key)
    }
  }

  return keys
}

interface GanttChartProps {
  config: SimulationConfig
  result: SimulationResult
  currentTime?: number
  activeSliceIndex?: number
  resolvedHover?: ResolvedTimelineHighlight | null
  onHoverChange?: (hover: TimelineHoverState) => void
  className?: string
}

interface MissedJobSegment {
  jobId: string
  taskId: string
  taskIndex: number
  start: number
  end: number
}

function getMissedJobSegments(
  executionLog: SimulationResult['executionLog'],
  missedJobIds: Set<string>,
): MissedJobSegment[] {
  const segments: MissedJobSegment[] = []

  for (let index = 0; index < executionLog.length; index++) {
    const slice = executionLog[index]
    if (!missedJobIds.has(slice.jobId)) continue

    const prev = executionLog[index - 1]
    const continuesFromPrev =
      prev !== undefined &&
      prev.jobId === slice.jobId &&
      prev.end === slice.start &&
      missedJobIds.has(prev.jobId)

    if (continuesFromPrev) continue

    let end = slice.end
    let nextIndex = index + 1
    while (nextIndex < executionLog.length) {
      const next = executionLog[nextIndex]
      if (next.jobId === slice.jobId && next.start === end && missedJobIds.has(next.jobId)) {
        end = next.end
        nextIndex++
      } else {
        break
      }
    }

    segments.push({
      jobId: slice.jobId,
      taskId: slice.taskId,
      taskIndex: getTaskIndex(slice.taskId),
      start: slice.start,
      end,
    })
  }

  return segments
}

function getMissedJobVisualSegments(
  allJobs: ReturnType<typeof generateJobs>,
  executionLog: SimulationResult['executionLog'],
  missedJobIds: Set<string>,
): MissedJobSegment[] {
  const segments = getMissedJobSegments(executionLog, missedJobIds)

  for (const job of allJobs) {
    if (!missedJobIds.has(job.id)) continue

    const executed = getJobExecutedDuration(job.id, executionLog)
    if (executed >= job.computationTime - 1e-9) continue

    const plannedEnd = capJobVisualEnd(job, job.arrival + job.computationTime, allJobs)
    const existing = segments.find((segment) => segment.jobId === job.id)

    if (existing) {
      existing.end = capJobVisualEnd(job, Math.max(existing.end, plannedEnd), allJobs)
      continue
    }

    const start = job.arrival + executed
    if (plannedEnd <= start) continue

    segments.push({
      jobId: job.id,
      taskId: job.taskId,
      taskIndex: getTaskIndex(job.taskId),
      start,
      end: plannedEnd,
    })
  }

  return segments
    .map((segment) => {
      const job = allJobs.find((candidate) => candidate.id === segment.jobId)
      if (!job) return segment
      return {
        ...segment,
        end: capJobVisualEnd(job, segment.end, allJobs),
      }
    })
    .filter((segment) => segment.end > segment.start)
}

export function GanttChart({
  config,
  result,
  currentTime,
  activeSliceIndex,
  resolvedHover,
  onHoverChange,
  className,
}: GanttChartProps) {
  const allJobs = generateJobs(config)
  const chartEndTime = getChartEndTime(config, allJobs)
  const pixelsPerUnit = 40
  const chartWidth = chartEndTime * pixelsPerUnit
  const tickStep = getChartTickStep(chartEndTime)

  const missedJobIds = new Set(
    result.jobs.filter((job) => job.missedDeadline).map((job) => job.jobId),
  )
  const missedJobSegments = getMissedJobVisualSegments(allJobs, result.executionLog, missedJobIds)
  const queueWaitSegments = getQueueWaitSegments(
    allJobs,
    result.timelineSnapshots,
    config.simulation_time,
  )
  const mergedSegments = getMergedExecutionSegments(result.executionLog)

  const labelCandidates: JobLabelCandidate[] = []

  for (const job of allJobs) {
    if (!isJobIncompleteOnChart(job, result.executionLog)) continue

    const executed = getJobExecutedDuration(job.id, result.executionLog)
    const segmentStart = job.arrival + executed
    const segmentEnd = capJobVisualEnd(job, job.arrival + job.computationTime, allJobs)
    if (segmentEnd <= segmentStart) continue

    labelCandidates.push({
      key: `planned-${job.id}`,
      jobId: job.id,
      start: segmentStart,
      end: segmentEnd,
      priority: 1,
    })
  }

  for (const segment of queueWaitSegments) {
    labelCandidates.push({
      key: `wait-${segment.jobId}-${segment.start}`,
      jobId: segment.jobId,
      start: segment.start,
      end: segment.end,
      priority: 2,
    })
  }

  for (const segment of mergedSegments) {
    labelCandidates.push({
      key: `exec-${segment.jobId}-${segment.start}-${segment.end}`,
      jobId: segment.jobId,
      start: segment.start,
      end: segment.end,
      priority: 3,
    })
  }

  const jobLabelKeys = getJobLabelKeys(labelCandidates, pixelsPerUnit)

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <div
        className="relative min-w-max rounded-lg border bg-card p-4"
        style={{ paddingLeft: LABEL_WIDTH + CHART_PADDING }}
      >
        <div
          className="relative"
          style={{
            width: chartWidth,
            height: config.tasks.length * ROW_HEIGHT + 32,
          }}
        >
          {config.tasks.map((task, index) => {
            const labelHighlighted = resolvedHover?.taskIds.has(task.id) ?? false
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: task label drives linked hover highlight
              <div
                key={task.id}
                className={cn(
                  'absolute left-0 flex cursor-default items-center rounded-sm px-1 text-sm font-medium transition-colors duration-150',
                  labelHighlighted && 'bg-primary/10 ring-1 ring-inset ring-primary/30',
                )}
                style={{
                  top: index * ROW_HEIGHT,
                  height: ROW_HEIGHT,
                  marginLeft: -(LABEL_WIDTH + CHART_PADDING - 8),
                  width: LABEL_WIDTH,
                }}
                {...{ [TIMELINE_HOVER_ZONE_ATTR]: '' }}
                onMouseEnter={() => onHoverChange?.({ source: 'task', taskId: task.id })}
                onMouseLeave={(e) => handleTimelineHoverLeave(e, onHoverChange)}
              >
                {task.id}
              </div>
            )
          })}

          {Array.from({ length: Math.floor(chartEndTime / tickStep) + 1 }).map((_, i) => {
            const tick = i * tickStep
            return (
              <div
                key={tick}
                className="absolute bottom-0 border-l border-border/40 text-xs text-muted-foreground"
                style={{ left: tick * pixelsPerUnit, height: config.tasks.length * ROW_HEIGHT }}
              >
                <span className="absolute -bottom-5 -translate-x-1/2">{tick}</span>
              </div>
            )
          })}

          {chartEndTime > config.simulation_time && (
            <div
              className="pointer-events-none absolute top-0 z-[1] border-l-2 border-dashed border-muted-foreground/40"
              style={{
                left: config.simulation_time * pixelsPerUnit,
                height: config.tasks.length * ROW_HEIGHT,
              }}
              title={`Fim da simulação (t=${config.simulation_time})`}
            />
          )}

          {resolvedHover?.timeColumn !== null && resolvedHover?.timeColumn !== undefined && (
            <div
              className="pointer-events-none absolute top-0 z-[5] bg-primary/10"
              style={{
                left: resolvedHover.timeColumn * pixelsPerUnit,
                width: pixelsPerUnit,
                height: config.tasks.length * ROW_HEIGHT,
              }}
            />
          )}

          {resolvedHover?.timeRange && (
            <div
              className="pointer-events-none absolute top-0 z-[5] bg-primary/5"
              style={{
                left: resolvedHover.timeRange[0] * pixelsPerUnit,
                width: (resolvedHover.timeRange[1] - resolvedHover.timeRange[0]) * pixelsPerUnit,
                height: config.tasks.length * ROW_HEIGHT,
              }}
            />
          )}

          {allJobs.map((job) => {
            const taskIndex = getTaskIndex(job.taskId)
            const rowTop = taskIndex * ROW_HEIGHT
            const deadlineX = job.absoluteDeadline * pixelsPerUnit
            const missed = missedJobIds.has(job.id)
            const highlighted = resolvedHover?.jobIds.has(job.id) ?? false

            return (
              <Tooltip key={`deadline-${job.id}`}>
                <TooltipTrigger
                  className={cn(
                    'absolute border-0 bg-transparent p-0 transition-opacity duration-150',
                    highlighted ? 'z-[6] opacity-100' : 'z-[1] opacity-70',
                    highlighted
                      ? missed
                        ? 'border-l-[3px] border-solid border-destructive'
                        : 'border-l-2 border-dashed border-destructive/90'
                      : 'border-l-2 border-dashed border-muted-foreground/35',
                  )}
                  style={{
                    left: deadlineX - (highlighted && missed ? 1.5 : 1),
                    top: rowTop + 2,
                    width: highlighted && missed ? 3 : 2,
                    height: ROW_HEIGHT - 8,
                  }}
                  {...{ [TIMELINE_HOVER_ZONE_ATTR]: '' }}
                  onMouseEnter={() => onHoverChange?.({ source: 'job', jobId: job.id })}
                  onMouseLeave={(e) => handleTimelineHoverLeave(e, onHoverChange)}
                />
                <TooltipContent>
                  <p className="font-medium">
                    {job.taskId} job#{job.jobIndex} · deadline em t={job.absoluteDeadline}
                  </p>
                  {missed && (
                    <p className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Deadline perdido
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}

          {missedJobSegments.map((segment) => {
            const segmentHighlighted = resolvedHover?.jobIds.has(segment.jobId) ?? false
            return (
              <div
                key={`missed-ring-${segment.jobId}-${segment.start}`}
                className={cn(
                  'pointer-events-none absolute rounded-sm ring-2 ring-destructive transition-shadow duration-150',
                  segmentHighlighted ? 'z-[4] ring-primary' : 'z-[2]',
                )}
                style={{
                  left: segment.start * pixelsPerUnit,
                  top: segment.taskIndex * ROW_HEIGHT + 6,
                  width: Math.max((segment.end - segment.start) * pixelsPerUnit, 2),
                  height: ROW_HEIGHT - 12,
                }}
              />
            )
          })}

          {allJobs.map((job) => {
            if (!isJobIncompleteOnChart(job, result.executionLog)) return null

            const taskIndex = getTaskIndex(job.taskId)
            const executed = getJobExecutedDuration(job.id, result.executionLog)
            const segmentStart = job.arrival + executed
            const segmentEnd = capJobVisualEnd(job, job.arrival + job.computationTime, allJobs)
            if (segmentEnd <= segmentStart) return null

            const visualRemaining = segmentEnd - segmentStart
            const left = segmentStart * pixelsPerUnit
            const width = Math.max(visualRemaining * pixelsPerUnit, 2)
            const top = taskIndex * ROW_HEIGHT + 6
            const missed = missedJobIds.has(job.id)
            const highlighted = resolvedHover?.jobIds.has(job.id) ?? false
            const showJobIndex = jobLabelKeys.has(`planned-${job.id}`)

            return (
              <Tooltip key={`planned-${job.id}`}>
                <TooltipTrigger
                  className={cn(
                    'absolute flex items-center justify-center rounded-sm border border-dashed p-0 transition-shadow',
                    missed
                      ? 'border-destructive/30 bg-muted/50 opacity-75'
                      : 'border-muted-foreground/25 bg-muted/35 opacity-60',
                    highlighted && 'z-[2] opacity-90 ring-2 ring-primary',
                  )}
                  style={{
                    left,
                    top,
                    width,
                    height: ROW_HEIGHT - 12,
                  }}
                  {...{ [TIMELINE_HOVER_ZONE_ATTR]: '' }}
                  onMouseEnter={() => onHoverChange?.({ source: 'job', jobId: job.id })}
                  onMouseLeave={(e) => handleTimelineHoverLeave(e, onHoverChange)}
                >
                  {showJobIndex && (
                    <span className="pointer-events-none select-none text-[11px] font-bold leading-none text-muted-foreground">
                      #{job.jobIndex}
                    </span>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">
                    {job.taskId} job#{job.jobIndex} · {visualRemaining}u CPU não executadas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {executed}u executadas de {job.computationTime}u planejadas
                  </p>
                  {missed && (
                    <p className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Deadline perdido
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}

          {queueWaitSegments.map((segment) => {
            const taskColor = getTaskColor(segment.taskIndex)
            const width = Math.max((segment.end - segment.start) * pixelsPerUnit, 2)
            const left = segment.start * pixelsPerUnit
            const top = segment.taskIndex * ROW_HEIGHT + 6
            const highlighted = resolvedHover?.jobIds.has(segment.jobId) ?? false
            const showJobIndex = jobLabelKeys.has(`wait-${segment.jobId}-${segment.start}`)
            const missed = missedJobIds.has(segment.jobId)

            return (
              <Tooltip key={`wait-${segment.jobId}-${segment.start}`}>
                <TooltipTrigger
                  className={cn(
                    'absolute flex items-center justify-center rounded-sm border border-dashed bg-transparent p-0 transition-shadow',
                    highlighted && 'z-[3] ring-2 ring-primary',
                  )}
                  style={{
                    left,
                    top,
                    width,
                    height: ROW_HEIGHT - 12,
                    borderColor: taskColor,
                    opacity: highlighted ? 1 : 0.9,
                  }}
                  {...{ [TIMELINE_HOVER_ZONE_ATTR]: '' }}
                  onMouseEnter={() => onHoverChange?.({ source: 'job', jobId: segment.jobId })}
                  onMouseLeave={(e) => handleTimelineHoverLeave(e, onHoverChange)}
                >
                  {showJobIndex && (
                    <span
                      className="pointer-events-none select-none text-[11px] font-bold leading-none"
                      style={{ color: taskColor }}
                    >
                      #{segment.jobIndex}
                    </span>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">
                    {segment.taskId} job#{segment.jobIndex} · [{segment.start}, {segment.end}) ·{' '}
                    {segment.end - segment.start}u na fila
                  </p>
                  {missed && (
                    <p className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Deadline perdido
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}

          {mergedSegments.map((segment) => {
            const taskIndex = getTaskIndex(segment.taskId)
            const width = (segment.end - segment.start) * pixelsPerUnit
            const left = segment.start * pixelsPerUnit
            const top = taskIndex * ROW_HEIGHT + 6
            const isActive =
              activeSliceIndex !== undefined &&
              activeSliceIndex >= segment.startIndex &&
              activeSliceIndex <= segment.endIndex
            let isHighlighted = false
            if (resolvedHover) {
              for (let i = segment.startIndex; i <= segment.endIndex; i++) {
                if (resolvedHover.sliceIndices.has(i)) {
                  isHighlighted = true
                  break
                }
              }
            }
            const missed = missedJobIds.has(segment.jobId)

            const barWidth = Math.max(width, 2)
            const showExecutionNumber = jobLabelKeys.has(
              `exec-${segment.jobId}-${segment.start}-${segment.end}`,
            )

            return (
              <Tooltip key={`${segment.jobId}-${segment.start}-${segment.end}`}>
                <TooltipTrigger
                  className={cn(
                    'absolute flex items-center justify-center rounded-sm border-0 bg-transparent p-0 opacity-90 transition-shadow',
                    isActive && 'animate-pulse ring-2 ring-primary',
                    isHighlighted && !isActive && 'z-10 ring-2 ring-primary opacity-100',
                  )}
                  style={{
                    left,
                    top,
                    width: barWidth,
                    height: ROW_HEIGHT - 12,
                    backgroundColor: getTaskColor(taskIndex),
                  }}
                  {...{ [TIMELINE_HOVER_ZONE_ATTR]: '' }}
                  onMouseEnter={() =>
                    onHoverChange?.({ source: 'chart', sliceIndex: segment.startIndex })
                  }
                  onMouseLeave={(e) => handleTimelineHoverLeave(e, onHoverChange)}
                >
                  {showExecutionNumber && (
                    <span className="pointer-events-none select-none text-[11px] font-bold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                      #{segment.jobIndex}
                    </span>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">
                    {segment.taskId} job#{segment.jobIndex} · [{segment.start}, {segment.end}) ·{' '}
                    {segment.end - segment.start}u CPU
                  </p>
                  {missed && (
                    <p className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      Deadline perdido
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}

          {allJobs.map((job) => {
            const taskIndex = getTaskIndex(job.taskId)
            const rowTop = taskIndex * ROW_HEIGHT
            const arrivalX = job.arrival * pixelsPerUnit
            const color = getTaskColor(taskIndex)
            const highlighted = resolvedHover?.jobIds.has(job.id) ?? false
            const markerColor = highlighted ? color : 'hsl(var(--muted-foreground) / 0.35)'

            return (
              <Tooltip key={`arrival-${job.id}`}>
                <TooltipTrigger
                  className={cn(
                    'absolute border-0 bg-transparent p-0 transition-opacity duration-150',
                    highlighted ? 'z-[11] opacity-100' : 'z-[3] opacity-70',
                  )}
                  style={{
                    left: arrivalX - 3,
                    top: rowTop,
                    width: 6,
                    height: ROW_HEIGHT - 4,
                  }}
                  {...{ [TIMELINE_HOVER_ZONE_ATTR]: '' }}
                  onMouseEnter={() => onHoverChange?.({ source: 'job', jobId: job.id })}
                  onMouseLeave={(e) => handleTimelineHoverLeave(e, onHoverChange)}
                >
                  <span
                    className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 transition-[border-color] duration-150"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: `6px solid ${markerColor}`,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute bottom-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors duration-150"
                    style={{
                      top: 6,
                      backgroundColor: markerColor,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">
                    {job.taskId} job#{job.jobIndex} · chegada em t={job.arrival}
                  </p>
                </TooltipContent>
              </Tooltip>
            )
          })}

          {currentTime !== undefined && (
            <div
              className="absolute top-0 z-10 w-0.5 bg-destructive"
              style={{
                left: currentTime * pixelsPerUnit,
                height: config.tasks.length * ROW_HEIGHT,
              }}
            />
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        {config.tasks.map((task, index) => (
          <div key={task.id} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: getTaskColor(index) }}
            />
            <span>{task.id}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block h-0 w-0 border-x-[4px] border-t-[6px] border-x-transparent border-t-foreground/60" />
          <span>chegada na fila</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span
            className="inline-block h-3 w-6 rounded-sm border border-dashed bg-transparent"
            style={{ borderColor: getTaskColor(0) }}
          />
          <span>espera na fila</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block h-3 w-6 rounded-sm border border-dashed border-muted-foreground/35 bg-muted/40" />
          <span>CPU não executada</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <svg
            className="inline-block h-3 w-[2px] shrink-0 text-destructive/90"
            viewBox="0 0 2 12"
            aria-hidden="true"
          >
            <line
              x1="1"
              y1="0"
              x2="1"
              y2="12"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
          </svg>
          <span>deadline</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block h-3 w-[3px] border-l-[3px] border-solid border-destructive" />
          <span>deadline perdido</span>
        </div>
      </div>
    </div>
  )
}
