import type { Edge, Node } from '@xyflow/react'
import { MarkerType } from '@xyflow/react'
import type { SchedulerName } from '@/lib/types'

type FlowNodeKind = 'start' | 'end' | 'process' | 'decision'

interface FlowStep {
  label: string
  kind: FlowNodeKind
  note?: string
}

const FLOWCHARTS: Record<SchedulerName, FlowStep[]> = {
  RR: [
    { label: 'Início (t=0)', kind: 'start' },
    {
      label: 'Novos jobs?',
      kind: 'decision',
      note: 'Adiciona à fila FIFO',
    },
    {
      label: 'CPU livre?',
      kind: 'decision',
      note: 'Despacha 1º da fila',
    },
    { label: 'Executa quantum', kind: 'process' },
    {
      label: 'Job terminou?',
      kind: 'decision',
      note: 'Não → fim da fila',
    },
    {
      label: 'Continua?',
      kind: 'decision',
      note: 'Sim → loop; Não → encerra',
    },
    { label: 'Fim — métricas', kind: 'end' },
  ],
  PRR: [
    { label: 'Início (t=0)', kind: 'start' },
    {
      label: 'Novos jobs?',
      kind: 'decision',
      note: 'Enfileira; preempta se maior prioridade',
    },
    {
      label: 'CPU livre?',
      kind: 'decision',
      note: 'Despacha maior prioridade',
    },
    { label: 'Executa quantum', kind: 'process' },
    {
      label: 'Job terminou?',
      kind: 'decision',
      note: 'Não → volta à fila por prioridade',
    },
    { label: 'Continua?', kind: 'decision', note: 'Sim → loop' },
    { label: 'Fim — métricas', kind: 'end' },
  ],
  RR_PRIORITY: [
    { label: 'Início (t=0)', kind: 'start' },
    {
      label: 'Novos jobs?',
      kind: 'decision',
      note: 'Enfileira; preempta se maior prioridade',
    },
    {
      label: 'CPU livre?',
      kind: 'decision',
      note: 'Despacha maior prioridade',
    },
    { label: 'Executa quantum', kind: 'process' },
    {
      label: 'Job terminou?',
      kind: 'decision',
      note: 'Não → volta à fila por prioridade',
    },
    { label: 'Continua?', kind: 'decision', note: 'Sim → loop' },
    { label: 'Fim — métricas', kind: 'end' },
  ],
  RM: [
    { label: 'Início (t=0)', kind: 'start' },
    {
      label: 'Jobs periódicos?',
      kind: 'decision',
      note: 'Preempta se período menor',
    },
    {
      label: 'CPU livre?',
      kind: 'decision',
      note: 'Despacha menor período',
    },
    { label: 'Executa até terminar', kind: 'process' },
    {
      label: 'Job concluído?',
      kind: 'decision',
      note: 'Aguarda próxima liberação',
    },
    { label: 'Continua?', kind: 'decision' },
    { label: 'Fim — Liu & Layland', kind: 'end' },
  ],
  EDF: [
    { label: 'Início (t=0)', kind: 'start' },
    {
      label: 'Novos jobs?',
      kind: 'decision',
      note: 'Preempta se deadline mais cedo',
    },
    {
      label: 'CPU livre?',
      kind: 'decision',
      note: 'Despacha menor deadline',
    },
    { label: 'Executa até terminar', kind: 'process' },
    {
      label: 'Job concluído?',
      kind: 'decision',
      note: 'Verifica cumprimento do prazo',
    },
    { label: 'Continua?', kind: 'decision' },
    { label: 'Fim — U≤1', kind: 'end' },
  ],
}

const NODE_WIDTH = 196
const CANVAS_WIDTH = 260
const CENTER_X = (CANVAS_WIDTH - NODE_WIDTH) / 2
const ARROW_GAP = 18

const NODE_HEIGHT: Record<FlowNodeKind, number> = {
  start: 30,
  end: 30,
  process: 34,
  decision: 52,
}

const NOTE_HEIGHT = 14

function stepBlockHeight(step: FlowStep): number {
  return NODE_HEIGHT[step.kind] + (step.note ? NOTE_HEIGHT : 0) + ARROW_GAP
}

export function buildFlowElements(scheduler: SchedulerName): {
  nodes: Node[]
  edges: Edge[]
  height: number
  width: number
} {
  const steps = FLOWCHARTS[scheduler]
  let y = 0
  const nodes: Node[] = []

  for (const [index, step] of steps.entries()) {
    nodes.push({
      id: `n-${index}`,
      type: step.kind,
      position: { x: CENTER_X, y },
      data: { label: step.label, note: step.note },
      draggable: false,
      selectable: false,
      focusable: false,
    })
    y += stepBlockHeight(step)
  }

  const edges: Edge[] = steps.slice(1).map((_, index) => ({
    id: `e-${index}`,
    source: `n-${index}`,
    target: `n-${index + 1}`,
    type: 'straight',
    style: { stroke: 'var(--border)', strokeWidth: 1.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: 'var(--muted-foreground)',
    },
  }))

  return {
    nodes,
    edges,
    height: Math.max(y - ARROW_GAP + 8, 120),
    width: CANVAS_WIDTH,
  }
}
