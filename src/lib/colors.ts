const TASK_COLORS = [
  'hsl(217 91% 60%)', // T0 azul
  'hsl(142 71% 45%)', // T1 verde
  'hsl(38 92% 50%)', // T2 âmbar
  'hsl(271 81% 56%)', // T3 roxo
  'hsl(330 81% 60%)', // T4 rosa
  'hsl(189 94% 43%)', // T5 ciano
]

export function getTaskColor(taskIndex: number): string {
  return TASK_COLORS[taskIndex % TASK_COLORS.length]
}

type HslComponents = { h: number; s: number; l: number }

function parseHsl(hsl: string): HslComponents | null {
  const match = /hsl\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*\)/.exec(hsl)
  if (!match) return null
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) }
}

function formatHsl({ h, s, l }: HslComponents): string {
  return `hsl(${h} ${s}% ${l}%)`
}

export function getTaskBadgeColors(taskIndex: number): {
  background: string
  border: string
  dot: string
  text: string
} {
  const base = parseHsl(getTaskColor(taskIndex))
  if (!base) {
    const fallback = getTaskColor(taskIndex)
    return { background: fallback, border: fallback, dot: fallback, text: fallback }
  }

  return {
    background: formatHsl({ h: base.h, s: Math.min(base.s, 55), l: 92 }),
    border: formatHsl({ h: base.h, s: base.s, l: Math.max(base.l - 12, 28) }),
    dot: formatHsl(base),
    text: formatHsl({ h: base.h, s: Math.min(base.s + 5, 80), l: Math.max(base.l - 22, 22) }),
  }
}

export function getTaskIndex(taskId: string): number {
  const match = /^T(\d+)$/.exec(taskId)
  return match ? Number.parseInt(match[1], 10) : 0
}

export function isRealtimeScheduler(scheduler: string): boolean {
  return scheduler === 'RM' || scheduler === 'EDF'
}
