import { Pause, Play, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GanttChart } from '@/components/GanttChart'
import { TimelineStateTable } from '@/components/TimelineStateTable'
import { Button } from '@/components/ui/button'
import { getTaskBadgeColors, getTaskIndex } from '@/lib/colors'
import { findExecutionSliceIndexAtTime, getTimelineSnapshotAtTime } from '@/lib/timeline-state'
import type { TimelineSnapshotJob } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import {
  getMergedExecutionSegments,
  type ResolvedTimelineHighlight,
  type TimelineHoverState,
} from '@/lib/timeline-hover'
import type { SimulationConfig, SimulationResult } from '@/lib/types'

const SPEED_OPTIONS = [
  { value: '0.5', label: '0.5x' },
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '4', label: '4x' },
]

function CompactJobChip({
  job,
  className,
}: {
  job: Pick<TimelineSnapshotJob, 'taskId' | 'jobIndex'>
  className?: string
}) {
  const colors = getTaskBadgeColors(getTaskIndex(job.taskId))

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-px font-mono text-[11px] leading-tight',
        className,
      )}
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      <span className="font-bold">{job.taskId}</span>#{job.jobIndex}
    </span>
  )
}

interface TimelineViewProps {
  config: SimulationConfig
  result: SimulationResult
  resolvedHover: ResolvedTimelineHighlight | null
  onHoverChange: (hover: TimelineHoverState) => void
}

export function TimelineView({ config, result, resolvedHover, onHoverChange }: TimelineViewProps) {
  const slices = result.executionLog
  const mergedSegments = useMemo(() => getMergedExecutionSegments(slices), [slices])
  const maxTime = config.simulation_time
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState('1')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sliceIndex = findExecutionSliceIndexAtTime(slices, currentTime)
  const currentSlice = sliceIndex !== null ? slices[sliceIndex] : undefined
  const activeSegment = mergedSegments.find(
    (segment) => currentTime >= segment.start && currentTime < segment.end,
  )
  const currentSnapshot = getTimelineSnapshotAtTime(config, result, currentTime)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    setCurrentTime(0)
    setPlaying(false)
  }, [result])

  useEffect(() => {
    if (!playing) {
      clearTimer()
      return
    }

    const intervalMs = 500 / Number.parseFloat(speed)
    timerRef.current = setInterval(() => {
      setCurrentTime((time) => {
        if (time >= maxTime) {
          setPlaying(false)
          return time
        }
        return time + 1
      })
    }, intervalMs)

    return clearTimer
  }, [playing, speed, maxTime, clearTimer])

  useEffect(() => () => clearTimer(), [clearTimer])

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2 pb-3 sm:gap-3">
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentTime(0)}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentTime((time) => Math.max(0, time - 1))}
          >
            <StepBack className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setPlaying((current) => !current)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentTime((time) => Math.min(maxTime, time + 1))}
          >
            <StepForward className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentTime(maxTime)}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative flex min-w-[8rem] flex-1 basis-48 items-center self-center">
          <div className="flex h-8 w-full items-center">
            <Slider
              value={[currentTime]}
              min={0}
              max={maxTime}
              step={1}
              title={`Tempo: ${currentTime} / ${maxTime}`}
              onValueChange={(value) => {
                setPlaying(false)
                const next = Array.isArray(value) ? value[0] : value
                setCurrentTime(next)
              }}
            />
          </div>
          <p className="absolute inset-x-0 top-full mt-1 text-center text-[10px] leading-none text-muted-foreground tabular-nums sm:text-xs">
            Tempo: {currentTime} / {maxTime}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-muted-foreground">Velocidade</span>
          <Select value={speed} onValueChange={(value) => value && setSpeed(value)}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-3 py-2">
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Agora executando
          </span>
          {activeSegment ? (
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              [{activeSegment.start}, {activeSegment.end})
            </span>
          ) : null}
        </div>

        {currentSnapshot || currentSlice ? (
          <>
            {(activeSegment ?? currentSlice) ? (
              <CompactJobChip job={activeSegment ?? currentSlice!} className="text-sm" />
            ) : currentSnapshot?.running ? (
              <CompactJobChip job={currentSnapshot.running} className="text-sm" />
            ) : (
              <span className="text-[11px] text-muted-foreground">CPU ociosa</span>
            )}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <span className="shrink-0 text-[10px] text-muted-foreground">Fila atual</span>
              {currentSnapshot && currentSnapshot.queue.length > 0 ? (
                currentSnapshot.queue.map((job) => (
                  <CompactJobChip key={job.jobId} job={job} />
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground">—</span>
              )}
            </div>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">CPU ociosa em t={currentTime}</span>
        )}
      </div>

      <GanttChart
        config={config}
        result={result}
        currentTime={currentTime}
        activeSliceIndex={sliceIndex ?? undefined}
        resolvedHover={resolvedHover}
        onHoverChange={onHoverChange}
      />

      <TimelineStateTable
        config={config}
        result={result}
        resolvedHover={resolvedHover}
        onHoverChange={onHoverChange}
      />
    </div>
  )
}
