import { ReactFlow, type NodeTypes } from '@xyflow/react'
import { useMemo } from 'react'
import { flowchartNodeTypes } from '@/components/flowchart/FlowchartNodes'
import { buildFlowElements } from '@/lib/flowchart-definitions'
import type { SchedulerName } from '@/lib/types'
import { cn } from '@/lib/utils'

import '@xyflow/react/dist/style.css'

export function AlgorithmFlowchart({ scheduler }: { scheduler: SchedulerName }) {
  const { nodes, edges, height, width } = useMemo(
    () => buildFlowElements(scheduler),
    [scheduler],
  )

  return (
    <div
      className="rounded-md border border-border/60 bg-muted/30 p-2"
      role="img"
      aria-label={`Fluxograma do algoritmo ${scheduler}`}
    >
      <p className="mb-1 text-center text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
        Fluxo de escalonamento
      </p>
      <div
        className={cn(
          'algorithm-flowchart mx-auto overflow-hidden rounded-sm',
          '[&_.react-flow__background]:hidden',
          '[&_.react-flow__panel]:hidden',
          '[&_.react-flow__attribution]:hidden',
          '[&_.react-flow__renderer]:bg-transparent',
          '[&_.react-flow__edge-path]:stroke-muted-foreground/70',
        )}
        style={{ width, height }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={flowchartNodeTypes as NodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          fitView
          fitViewOptions={{ padding: 0.08, minZoom: 1, maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
        />
      </div>
    </div>
  )
}
