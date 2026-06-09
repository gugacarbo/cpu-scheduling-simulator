import type { MouseEvent } from 'react'
import type { SimulationResult } from '@/lib/types'

/** Marks elements that participate in linked timeline hover (used by leave handler). */
export const TIMELINE_HOVER_ZONE_ATTR = 'data-timeline-hover-zone'

/** Clear hover when pointer leaves a zone, unless entering another hover zone. */
export function handleTimelineHoverLeave(
  event: MouseEvent,
  onHoverChange?: (hover: TimelineHoverState) => void,
): void {
  const related = event.relatedTarget
  if (
    related instanceof Element &&
    related.closest(`[${TIMELINE_HOVER_ZONE_ATTR}]`) !== null
  ) {
    return
  }
  onHoverChange?.(null)
}

export type TimelineHoverState =
  | { source: 'table'; time: number; jobId?: string }
  | { source: 'chart'; sliceIndex: number }
  | { source: 'job'; jobId: string }
  | { source: 'task'; taskId: string }
  | null

export interface ResolvedTimelineHighlight {
  sliceIndices: ReadonlySet<number>
  tableTimes: ReadonlySet<number>
  taskIds: ReadonlySet<string>
  jobIds: ReadonlySet<string>
  timeColumn: number | null
  timeRange: [number, number] | null
}

export interface ContiguousJobSliceGroup {
  startIndex: number
  endIndex: number
  start: number
  end: number
}

/** Adjacent execution slices of the same job (same jobId, consecutive times). */
export function getContiguousJobSliceGroup(
  executionLog: SimulationResult['executionLog'],
  sliceIndex: number,
): ContiguousJobSliceGroup | null {
  const slice = executionLog[sliceIndex]
  if (!slice) return null

  let startIndex = sliceIndex
  while (startIndex > 0) {
    const prev = executionLog[startIndex - 1]
    const current = executionLog[startIndex]
    if (prev.jobId === slice.jobId && prev.end === current.start) {
      startIndex--
    } else {
      break
    }
  }

  let endIndex = sliceIndex
  let end = slice.end
  while (endIndex + 1 < executionLog.length) {
    const next = executionLog[endIndex + 1]
    if (next.jobId === slice.jobId && next.start === end) {
      end = next.end
      endIndex++
    } else {
      break
    }
  }

  return {
    startIndex,
    endIndex,
    start: executionLog[startIndex].start,
    end,
  }
}

export interface MergedExecutionSegment {
  startIndex: number
  endIndex: number
  start: number
  end: number
  taskId: string
  jobId: string
  jobIndex: number
  /** 0-based periodic job instance for this taskId (same for all segments of a jobId). */
  executionNumber: number
}

/** Consecutive slices of the same job rendered as one Gantt bar. */
export function getMergedExecutionSegments(
  executionLog: SimulationResult['executionLog'],
): MergedExecutionSegment[] {
  const segments: MergedExecutionSegment[] = []

  for (let index = 0; index < executionLog.length; index++) {
    const group = getContiguousJobSliceGroup(executionLog, index)
    if (!group || index > group.startIndex) continue

    const slice = executionLog[group.startIndex]

    segments.push({
      startIndex: group.startIndex,
      endIndex: group.endIndex,
      start: group.start,
      end: group.end,
      taskId: slice.taskId,
      jobId: slice.jobId,
      jobIndex: slice.jobIndex,
      executionNumber: slice.jobIndex,
    })
  }

  return segments
}

function addSliceCoverage(
  executionLog: SimulationResult['executionLog'],
  sliceIndex: number,
  sliceIndices: Set<number>,
  tableTimes: Set<number>,
  jobIds: Set<string>,
): void {
  const slice = executionLog[sliceIndex]
  if (!slice) return
  sliceIndices.add(sliceIndex)
  jobIds.add(slice.jobId)
  for (let t = slice.start; t < slice.end; t++) {
    tableTimes.add(t)
  }
}

/** Table hover: time column + contiguous burst at that instant (not full job/task history). */
function addTableScopedHighlight(
  time: number,
  executionLog: SimulationResult['executionLog'],
  sliceIndices: Set<number>,
  jobIds: Set<string>,
  filterJobId?: string,
): [number, number] | null {
  for (let i = 0; i < executionLog.length; i++) {
    const slice = executionLog[i]
    if (slice.start > time || time >= slice.end) continue
    if (filterJobId && slice.jobId !== filterJobId) break
    const group = getContiguousJobSliceGroup(executionLog, i)
    if (!group) return null
    jobIds.add(slice.jobId)
    for (let j = group.startIndex; j <= group.endIndex; j++) {
      sliceIndices.add(j)
    }
    return [group.start, group.end]
  }

  if (!filterJobId) return null

  // Completed at this instant: highlight the contiguous burst that ends here.
  for (let i = executionLog.length - 1; i >= 0; i--) {
    const slice = executionLog[i]
    if (slice.jobId !== filterJobId || slice.end !== time) continue
    const group = getContiguousJobSliceGroup(executionLog, i)
    if (!group) return null
    jobIds.add(filterJobId)
    for (let j = group.startIndex; j <= group.endIndex; j++) {
      sliceIndices.add(j)
    }
    return [group.start, group.end]
  }

  return null
}

function addJobHighlight(
  jobId: string,
  executionLog: SimulationResult['executionLog'],
  sliceIndices: Set<number>,
  tableTimes: Set<number>,
  jobIds: Set<string>,
): [number, number] | null {
  jobIds.add(jobId)
  let rangeStart = Number.POSITIVE_INFINITY
  let rangeEnd = Number.NEGATIVE_INFINITY
  for (let i = 0; i < executionLog.length; i++) {
    if (executionLog[i].jobId !== jobId) continue
    addSliceCoverage(executionLog, i, sliceIndices, tableTimes, jobIds)
    rangeStart = Math.min(rangeStart, executionLog[i].start)
    rangeEnd = Math.max(rangeEnd, executionLog[i].end)
  }
  if (rangeStart < rangeEnd) {
    return [rangeStart, rangeEnd]
  }
  return null
}

/** Single resolver: every hover source maps to the same highlight dimensions. */
export function resolveTimelineHighlight(
  hover: TimelineHoverState,
  executionLog: SimulationResult['executionLog'],
): ResolvedTimelineHighlight | null {
  if (!hover) return null

  const sliceIndices = new Set<number>()
  const tableTimes = new Set<number>()
  const taskIds = new Set<string>()
  const jobIds = new Set<string>()
  let timeColumn: number | null = null
  let timeRange: [number, number] | null = null

  switch (hover.source) {
    case 'table': {
      timeColumn = hover.time
      tableTimes.add(hover.time)
      if (hover.jobId) {
        jobIds.add(hover.jobId)
      }
      timeRange = addTableScopedHighlight(
        hover.time,
        executionLog,
        sliceIndices,
        jobIds,
        hover.jobId,
      )
      break
    }
    case 'chart': {
      const slice = executionLog[hover.sliceIndex]
      if (!slice) return null
      timeRange = addJobHighlight(slice.jobId, executionLog, sliceIndices, tableTimes, jobIds)
      break
    }
    case 'job': {
      timeRange = addJobHighlight(hover.jobId, executionLog, sliceIndices, tableTimes, jobIds)
      break
    }
    case 'task': {
      taskIds.add(hover.taskId)
      for (let i = 0; i < executionLog.length; i++) {
        if (executionLog[i].taskId !== hover.taskId) continue
        addSliceCoverage(executionLog, i, sliceIndices, tableTimes, jobIds)
      }
      break
    }
  }

  return { sliceIndices, tableTimes, taskIds, jobIds, timeColumn, timeRange }
}
