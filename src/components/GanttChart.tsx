import { AlertTriangle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getTaskColor, getTaskIndex } from '@/lib/colors'
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

export function GanttChart({
  config,
  result,
  currentTime,
  activeSliceIndex,
  resolvedHover,
  onHoverChange,
  className,
}: GanttChartProps) {
  const simulationTime = config.simulation_time
  const pixelsPerUnit = 40
  const chartWidth = simulationTime * pixelsPerUnit
  const tickStep = simulationTime <= 20 ? 1 : 5
  const allJobs = generateJobs(config)

  const missedJobIds = new Set(
    result.jobs.filter((job) => job.missedDeadline).map((job) => job.jobId),
  )
  const missedJobSegments = getMissedJobSegments(result.executionLog, missedJobIds)
  const mergedSegments = getMergedExecutionSegments(result.executionLog)

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

          {Array.from({ length: Math.floor(simulationTime / tickStep) + 1 }).map((_, i) => {
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
            const showExecutionNumber = barWidth >= 14

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
