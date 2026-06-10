import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'

interface FlowNodeData extends Record<string, unknown> {
  label: string
  note?: string
}

const NODE_WIDTH_CLASS = 'w-[196px]'

function readData(data: NodeProps['data']): FlowNodeData {
  return data as FlowNodeData
}

function FlowNote({ note }: { note?: string }) {
  if (!note) return null

  return (
    <p className="mt-0.5 text-center text-[9px] leading-tight text-muted-foreground">{note}</p>
  )
}

function FlowHandles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!border-0 !bg-transparent !opacity-0"
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-0 !bg-transparent !opacity-0"
        isConnectable={false}
      />
    </>
  )
}

function StartNode({ data }: NodeProps) {
  const { label, note } = readData(data)

  return (
    <div className={NODE_WIDTH_CLASS}>
      <FlowHandles />
      <div
        className={cn(
          'rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5',
          'text-center text-[10px] font-medium leading-tight text-foreground',
        )}
      >
        {label}
      </div>
      <FlowNote note={note} />
    </div>
  )
}

function EndNode({ data }: NodeProps) {
  const { label, note } = readData(data)

  return (
    <div className={NODE_WIDTH_CLASS}>
      <FlowHandles />
      <div
        className={cn(
          'rounded-full border border-border bg-muted px-3 py-1.5',
          'text-center text-[10px] font-medium leading-tight text-foreground',
        )}
      >
        {label}
      </div>
      <FlowNote note={note} />
    </div>
  )
}

function ProcessNode({ data }: NodeProps) {
  const { label, note } = readData(data)

  return (
    <div className={NODE_WIDTH_CLASS}>
      <FlowHandles />
      <div
        className={cn(
          'rounded-md border border-border bg-background px-3 py-1.5',
          'text-center text-[10px] leading-tight text-foreground',
        )}
      >
        {label}
      </div>
      <FlowNote note={note} />
    </div>
  )
}

function DecisionNode({ data }: NodeProps) {
  const { label, note } = readData(data)

  return (
    <div className={NODE_WIDTH_CLASS}>
      <FlowHandles />
      <div className="relative mx-auto flex h-11 w-28 items-center justify-center">
        <div
          className={cn(
            'absolute inset-0 rotate-45 rounded-sm',
            'border border-dashed border-amber-500/60 bg-amber-500/10',
          )}
          aria-hidden="true"
        />
        <span className="relative z-10 px-1 text-center text-[10px] font-medium leading-tight text-foreground">
          {label}
        </span>
      </div>
      <FlowNote note={note} />
    </div>
  )
}

export const flowchartNodeTypes = {
  start: StartNode,
  end: EndNode,
  process: ProcessNode,
  decision: DecisionNode,
}
