import { useEffect, useId, useRef, useState } from 'react'
import { buildMermaidDiagramForScheduler } from '@/lib/flowchart-definitions'
import type { SchedulerName } from '@/lib/types'
import { cn } from '@/lib/utils'

function useDocumentTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light',
  )

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setTheme(root.classList.contains('dark') ? 'dark' : 'light')
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return theme
}

function configureMermaid(mermaid: typeof import('mermaid').default, theme: 'light' | 'dark') {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'base',
    securityLevel: 'strict',
    fontFamily: '"Geist Variable", sans-serif',
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      wrappingWidth: 220,
      padding: 12,
    },
  })
}

export function AlgorithmFlowchart({ scheduler }: { scheduler: SchedulerName }) {
  const theme = useDocumentTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const renderId = useId().replace(/:/g, '')
  const [renderError, setRenderError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    const render = async () => {
      setRenderError(null)

      const mermaid = (await import('mermaid')).default
      configureMermaid(mermaid, theme)

      const diagram = buildMermaidDiagramForScheduler(scheduler, theme)
      const graphId = `flowchart-${renderId}-${scheduler}`

      try {
        const { svg } = await mermaid.render(graphId, diagram)
        if (!cancelled) {
          container.innerHTML = svg
        }
      } catch (error) {
        if (!cancelled) {
          container.innerHTML = ''
          setRenderError(error instanceof Error ? error.message : 'Erro ao renderizar fluxograma')
        }
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [scheduler, theme, renderId])

  return (
    <div
      className="rounded-md border border-border/60 bg-muted/30 p-3"
      role="img"
      aria-label={`Fluxograma do algoritmo ${scheduler}`}
    >
      <p className="mb-2 text-center text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        Fluxo de escalonamento
      </p>
      <div
        ref={containerRef}
        className={cn(
          'algorithm-flowchart flex justify-center overflow-x-auto',
          '[&_svg]:h-auto [&_svg]:max-w-full',
          '[&_.edgeLabel]:text-[10px] [&_.edgeLabel]:leading-snug',
          '[&_.nodeLabel]:text-[11px] [&_.nodeLabel]:leading-snug',
        )}
      />
      {renderError ? (
        <p className="mt-2 text-center text-[11px] text-destructive">{renderError}</p>
      ) : null}
    </div>
  )
}
