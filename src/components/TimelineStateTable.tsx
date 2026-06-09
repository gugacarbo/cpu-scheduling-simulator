import { Check } from 'lucide-react'
import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getTaskBadgeColors, getTaskIndex } from '@/lib/colors'
import {
  handleTimelineHoverLeave,
  TIMELINE_HOVER_ZONE_ATTR,
  type ResolvedTimelineHighlight,
  type TimelineHoverState,
} from '@/lib/timeline-hover'
import {
  buildJobsFinishedByTime,
  buildJobTooltipInfo,
  buildTimelineStateTable,
  getJobProgress,
} from '@/lib/timeline-state'
import type { JobMetrics, SimulationConfig, SimulationResult, TimelineSnapshotJob } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TimelineStateTableProps {
  config: SimulationConfig
  result: SimulationResult
  resolvedHover?: ResolvedTimelineHighlight | null
  onHoverChange?: (hover: TimelineHoverState) => void
  className?: string
}

function JobBadge({
  config,
  job,
  snapshotTime,
  highlighted,
  onHoverChange,
}: {
  config: SimulationConfig
  job: TimelineSnapshotJob
  snapshotTime: number
  highlighted: boolean
  onHoverChange?: (hover: TimelineHoverState) => void
}) {
  const taskIndex = getTaskIndex(job.taskId)
  const colors = getTaskBadgeColors(taskIndex)
  const progress = getJobProgress(job)
  const tooltip = buildJobTooltipInfo(config, job, snapshotTime)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          // biome-ignore lint/a11y/noStaticElementInteractions: badge drives linked hover highlight
          <span
            className={cn(
              'inline-flex min-w-[3.25rem] cursor-default flex-col gap-0.5 rounded border px-1.5 py-0.5 text-xs transition-shadow duration-150',
              highlighted && 'ring-2 ring-primary',
            )}
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.text,
            }}
            {...{ [TIMELINE_HOVER_ZONE_ATTR]: '' }}
            onMouseEnter={() =>
              onHoverChange?.({ source: 'table', time: snapshotTime, jobId: job.jobId })
            }
            onMouseLeave={(e) => handleTimelineHoverLeave(e, onHoverChange)}
          >
            <span className="flex items-center justify-between gap-1.5 leading-none">
              <span>
                <span className="font-bold">{job.taskId}</span>#{job.jobIndex}
              </span>
              <span
                className="font-mono text-[10px] tabular-nums leading-none"
                title={`${progress.remaining}u restantes`}
              >
                {progress.remaining}u
              </span>
            </span>
            <span
              className="block h-0.5 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: `${colors.border}55` }}
              aria-hidden
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${progress.percent}%`,
                  backgroundColor: colors.dot,
                }}
              />
            </span>
          </span>
        }
      />
      <TooltipContent side="top" className="max-w-[14rem] flex-col items-start gap-2 p-2.5">
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: colors.dot }}
              aria-hidden
            />
            <span className="font-semibold leading-none">{tooltip.label}</span>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-background/60 tabular-nums">
            t={snapshotTime}
          </span>
        </div>

        <div className="w-full">
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-background/70">
            <span>CPU</span>
            <span className="font-mono tabular-nums">
              {tooltip.progress.elapsed}/{tooltip.progress.total}u ·{' '}
              <span className="text-background">{tooltip.progress.remaining}u rest.</span>
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-background/20">
            <div
              className="h-full rounded-full"
              style={{
                width: `${tooltip.progress.percent}%`,
                backgroundColor: colors.dot,
              }}
            />
          </div>
        </div>

        <dl className="grid w-full grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[10px]">
          {tooltip.fields.map((field) => (
            <div key={field.label} className="contents">
              <dt className="text-background/60">{field.label}</dt>
              <dd className="font-mono text-right tabular-nums">{field.value}</dd>
            </div>
          ))}
        </dl>
      </TooltipContent>
    </Tooltip>
  )
}

function CompletedJobBadge({
  job,
  highlighted,
  onHoverChange,
}: {
  job: JobMetrics
  highlighted: boolean
  onHoverChange?: (hover: TimelineHoverState) => void
}) {
  const taskIndex = getTaskIndex(job.taskId)
  const colors = getTaskBadgeColors(taskIndex)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          // biome-ignore lint/a11y/noStaticElementInteractions: badge drives linked hover highlight
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded border border-dashed px-1.5 py-0.5 text-xs opacity-80 transition-shadow duration-150',
              highlighted && 'opacity-100 ring-2 ring-primary',
            )}
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.text,
            }}
            {...{ [TIMELINE_HOVER_ZONE_ATTR]: '' }}
            onMouseEnter={() =>
              onHoverChange?.({ source: 'table', time: job.finish, jobId: job.jobId })
            }
            onMouseLeave={(e) => handleTimelineHoverLeave(e, onHoverChange)}
          >
            <Check className="size-2.5 shrink-0" aria-hidden />
            <span>
              <span className="font-bold">{job.taskId}</span>#{job.jobIndex}
            </span>
            <span className="font-mono text-[10px] tabular-nums opacity-70">t={job.finish}</span>
          </span>
        }
      />
      <TooltipContent side="top" className="max-w-[12rem] flex-col items-start gap-1 p-2">
        <p className="font-semibold">
          {job.taskId}#{job.jobIndex} concluída
        </p>
        <p className="font-mono text-[10px] text-background/70">
          término t={job.finish} · TAT {job.tat}u · WT {job.wt}u
        </p>
        {job.missedDeadline && (
          <p className="text-[10px] text-destructive">Deadline perdido</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export function TimelineStateTable({
  config,
  result,
  resolvedHover,
  onHoverChange,
  className,
}: TimelineStateTableProps) {
  const snapshots = buildTimelineStateTable(config, result)
  const finishedByTime = useMemo(() => buildJobsFinishedByTime(result), [result])

  return (
    <div className={cn('mt-8', className)}>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        Estado por unidade de tempo
      </h3>
      <div className="max-h-[min(480px,70vh)] overflow-y-auto rounded-lg border">
        <Table>
          <TableCaption>
            Uma linha por instante t em [0, {config.simulation_time}), alinhado ao Gantt [
            {config.simulation_time} unidades).
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 w-16 bg-card">t</TableHead>
              <TableHead className="sticky top-0 z-10 min-w-[120px] bg-card">Fila</TableHead>
              <TableHead className="sticky top-0 z-10 bg-card">Executando</TableHead>
              <TableHead className="sticky top-0 z-10 bg-card">Concluídas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((snapshot) => {
              const rowHighlighted = resolvedHover?.tableTimes.has(snapshot.time) ?? false
              const finishedJobs = finishedByTime.get(snapshot.time) ?? []
              const isJobHighlighted = (jobId: string) =>
                (resolvedHover?.jobIds.has(jobId) ?? false) &&
                (resolvedHover?.tableTimes.has(snapshot.time) ?? false)
              return (
                <TableRow
                  key={snapshot.time}
                  className={cn(
                    rowHighlighted &&
                      'bg-primary/10 ring-1 ring-inset ring-primary/30 hover:bg-primary/10',
                  )}
                  {...{ [TIMELINE_HOVER_ZONE_ATTR]: '' }}
                  onMouseEnter={() => onHoverChange?.({ source: 'table', time: snapshot.time })}
                  onMouseLeave={(e) => handleTimelineHoverLeave(e, onHoverChange)}
                >
                  <TableCell className="font-mono text-muted-foreground">{snapshot.time}</TableCell>
                  <TableCell>
                    {snapshot.queue.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {snapshot.queue.map((job) => (
                          <JobBadge
                            key={job.jobId}
                            config={config}
                            job={job}
                            snapshotTime={snapshot.time}
                            highlighted={isJobHighlighted(job.jobId)}
                            onHoverChange={onHoverChange}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {snapshot.running ? (
                      <JobBadge
                        config={config}
                        job={snapshot.running}
                        snapshotTime={snapshot.time}
                        highlighted={isJobHighlighted(snapshot.running.jobId)}
                        onHoverChange={onHoverChange}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {finishedJobs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {finishedJobs.map((job) => (
                          <CompletedJobBadge
                            key={job.jobId}
                            job={job}
                            highlighted={isJobHighlighted(job.jobId)}
                            onHoverChange={onHoverChange}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
