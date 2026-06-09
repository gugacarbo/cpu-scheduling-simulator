import type { SchedulerName } from '@/lib/types'

type FlowNodeKind = 'start' | 'end' | 'process' | 'decision'

export interface FlowStep {
  label: string
  kind: FlowNodeKind
  note?: string
}

export const FLOWCHARTS: Record<SchedulerName, FlowStep[]> = {
  RR: [
    { label: 'Início da simulação (t = 0)', kind: 'start' },
    {
      label: 'Jobs chegaram em t?',
      kind: 'decision',
      note: 'Sim → adiciona à fila de prontos (FIFO)',
    },
    {
      label: 'CPU está livre?',
      kind: 'decision',
      note: 'Sim → despacha a primeira tarefa da fila',
    },
    { label: 'Executa por quantum (ou até o job terminar)', kind: 'process' },
    {
      label: 'Tempo de computação restante = 0?',
      kind: 'decision',
      note: 'Sim → job concluído; Não → job vai para o fim da fila',
    },
    {
      label: 't < tempo de simulação ou há trabalho pendente?',
      kind: 'decision',
      note: 'Sim → volta ao processamento; Não → encerra',
    },
    { label: 'Fim — calcula métricas (TAT, WT, etc.)', kind: 'end' },
  ],
  PRR: [
    { label: 'Início da simulação (t = 0)', kind: 'start' },
    {
      label: 'Jobs chegaram em t?',
      kind: 'decision',
      note: 'Sim → adiciona à fila; preempta se a nova tarefa tem maior prioridade (menor tempo de computação)',
    },
    {
      label: 'CPU está livre?',
      kind: 'decision',
      note: 'Sim → despacha o job de maior prioridade na fila',
    },
    { label: 'Executa por quantum (ou até o job terminar)', kind: 'process' },
    {
      label: 'Tempo de computação restante = 0?',
      kind: 'decision',
      note: 'Sim → job concluído; Não → job retorna à fila respeitando prioridade',
    },
    {
      label: 't < tempo de simulação ou há trabalho pendente?',
      kind: 'decision',
      note: 'Sim → continua; Não → encerra',
    },
    { label: 'Fim — calcula métricas (TAT, WT, etc.)', kind: 'end' },
  ],
  RR_PRIORITY: [
    { label: 'Início da simulação (t = 0)', kind: 'start' },
    {
      label: 'Jobs chegaram em t?',
      kind: 'decision',
      note: 'Sim → adiciona à fila; preempta se a nova tarefa tem maior prioridade (menor tempo de computação)',
    },
    {
      label: 'CPU está livre?',
      kind: 'decision',
      note: 'Sim → despacha o job de maior prioridade na fila',
    },
    { label: 'Executa por quantum (ou até o job terminar)', kind: 'process' },
    {
      label: 'Tempo de computação restante = 0?',
      kind: 'decision',
      note: 'Sim → job concluído; Não → job retorna à fila respeitando prioridade',
    },
    {
      label: 't < tempo de simulação ou há trabalho pendente?',
      kind: 'decision',
      note: 'Sim → continua; Não → encerra',
    },
    { label: 'Fim — calcula métricas (TAT, WT, etc.)', kind: 'end' },
  ],
  RM: [
    { label: 'Início da simulação (t = 0)', kind: 'start' },
    {
      label: 'Jobs periódicos chegaram em t?',
      kind: 'decision',
      note: 'Sim → adiciona à fila; preempta se o período do novo job é menor (prioridade maior)',
    },
    {
      label: 'CPU está livre?',
      kind: 'decision',
      note: 'Sim → despacha o job com menor período (maior taxa)',
    },
    { label: 'Executa até o job terminar (sem quantum)', kind: 'process' },
    {
      label: 'Job concluído?',
      kind: 'decision',
      note: 'Sim → libera CPU; aguarda próxima liberação periódica',
    },
    {
      label: 't < tempo de simulação ou há trabalho pendente?',
      kind: 'decision',
      note: 'Sim → continua; Não → encerra',
    },
    {
      label: 'Fim — verifica Liu & Layland e calcula métricas',
      kind: 'end',
      note: 'U ≤ n(2^(1/n) − 1) é condição suficiente de escalonabilidade',
    },
  ],
  EDF: [
    { label: 'Início da simulação (t = 0)', kind: 'start' },
    {
      label: 'Jobs chegaram em t?',
      kind: 'decision',
      note: 'Sim → adiciona à fila; preempta se o novo job tem prazo absoluto mais cedo',
    },
    {
      label: 'CPU está livre?',
      kind: 'decision',
      note: 'Sim → despacha o job com menor prazo absoluto (deadline)',
    },
    { label: 'Executa até o job terminar (sem quantum)', kind: 'process' },
    {
      label: 'Job concluído?',
      kind: 'decision',
      note: 'Sim → libera CPU; verifica se cumpriu o prazo',
    },
    {
      label: 't < tempo de simulação ou há trabalho pendente?',
      kind: 'decision',
      note: 'Sim → continua; Não → encerra',
    },
    {
      label: 'Fim — verifica U ≤ 1 e calcula métricas',
      kind: 'end',
      note: 'EDF é ótimo em uniprocessador quando U ≤ 1',
    },
  ],
}

function escapeMermaid(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '#quot;')
    .replace(/</g, '#lt;')
    .replace(/>/g, '#gt;')
}

function nodeLabel(step: FlowStep): string {
  if (step.note && step.kind === 'end') {
    return `${escapeMermaid(step.label)}<br/><span style="font-size:10px;opacity:0.75">${escapeMermaid(step.note)}</span>`
  }
  return escapeMermaid(step.label)
}

function classDefs(theme: 'light' | 'dark'): string[] {
  if (theme === 'dark') {
    return [
      'classDef startEnd fill:#172554,stroke:#60a5fa,color:#dbeafe,stroke-width:2px',
      'classDef decision fill:#422006,stroke:#f59e0b,color:#fde68a,stroke-width:2px',
      'classDef process fill:#1f2937,stroke:#6b7280,color:#f3f4f6,stroke-width:1px',
    ]
  }

  return [
    'classDef startEnd fill:#eff6ff,stroke:#3b82f6,color:#1e40af,stroke-width:2px',
    'classDef decision fill:#fffbeb,stroke:#f59e0b,color:#92400e,stroke-width:2px',
    'classDef process fill:#ffffff,stroke:#d1d5db,color:#374151,stroke-width:1px',
  ]
}

function buildMermaidDiagram(steps: FlowStep[], theme: 'light' | 'dark'): string {
  const lines: string[] = ['flowchart TD']

  for (const [index, step] of steps.entries()) {
    const id = `n${index}`
    const label = nodeLabel(step)

    switch (step.kind) {
      case 'start':
      case 'end':
        lines.push(`    ${id}(["${label}"])`)
        break
      case 'process':
        lines.push(`    ${id}["${label}"]`)
        break
      case 'decision':
        lines.push(`    ${id}{"${label}"}`)
        break
    }
  }

  for (let index = 0; index < steps.length - 1; index++) {
    const step = steps[index]
    const from = `n${index}`
    const to = `n${index + 1}`

    if (step.note && step.kind === 'decision') {
      lines.push(`    ${from} -->|"${escapeMermaid(step.note)}"| ${to}`)
    } else {
      lines.push(`    ${from} --> ${to}`)
    }
  }

  const startEnd: string[] = []
  const decisions: string[] = []
  const processes: string[] = []

  for (const [index, step] of steps.entries()) {
    const id = `n${index}`
    if (step.kind === 'start' || step.kind === 'end') startEnd.push(id)
    else if (step.kind === 'decision') decisions.push(id)
    else if (step.kind === 'process') processes.push(id)
  }

  lines.push(...classDefs(theme))

  if (startEnd.length > 0) lines.push(`    class ${startEnd.join(',')} startEnd`)
  if (decisions.length > 0) lines.push(`    class ${decisions.join(',')} decision`)
  if (processes.length > 0) lines.push(`    class ${processes.join(',')} process`)

  return lines.join('\n')
}

export function buildMermaidDiagramForScheduler(
  scheduler: SchedulerName,
  theme: 'light' | 'dark',
): string {
  return buildMermaidDiagram(FLOWCHARTS[scheduler], theme)
}
