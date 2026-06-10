import { GanttChart } from '@/components/GanttChart'
import { TimelineStateTable } from '@/components/TimelineStateTable'
import type { ResolvedTimelineHighlight, TimelineHoverState } from '@/lib/timeline-hover'
import type { SimulationConfig, SimulationResult } from '@/lib/types'

interface TimelineViewProps {
  config: SimulationConfig
  result: SimulationResult
  resolvedHover: ResolvedTimelineHighlight | null
  onHoverChange: (hover: TimelineHoverState) => void
}

export function TimelineView({ config, result, resolvedHover, onHoverChange }: TimelineViewProps) {
  return (
    <div className="space-y-0">
      <GanttChart
        config={config}
        result={result}
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
