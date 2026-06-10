import { BarChart3 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ConfigPanel } from '@/components/ConfigPanel'
import { LogExport } from '@/components/LogExport'
import { Header } from '@/components/layout/Header'
import { StatsPanel } from '@/components/StatsPanel'
import { TimelineView } from '@/components/TimelineView'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/hooks/use-theme'
import { resolveTimelineHighlight, type TimelineHoverState } from '@/lib/timeline-hover'
import type { SchedulerName, SimulationConfig, SimulationResult } from '@/lib/types'
import { runSchedulerSimulation } from '@/schedulers'

function App() {
  const { theme, toggleTheme } = useTheme()
  const [jsonText, setJsonText] = useState('')
  const [schedulerOverride, setSchedulerOverride] = useState<SchedulerName | null>(null)
  const [config, setConfig] = useState<SimulationConfig | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [timelineHover, setTimelineHover] = useState<TimelineHoverState>(null)

  const resolvedHover = useMemo(
    () =>
      timelineHover && result ? resolveTimelineHighlight(timelineHover, result.executionLog) : null,
    [timelineHover, result],
  )

  const handleSimulate = useCallback((nextConfig: SimulationConfig) => {
    const simulationResult = runSchedulerSimulation(nextConfig)
    setConfig(nextConfig)
    setResult(simulationResult)
    setTimelineHover(null)
  }, [])

  return (
    <div className="flex min-h-svh flex-col">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      {/* biome-ignore lint/a11y/noStaticElementInteractions: clears linked hover when pointer leaves timeline area */}
      <div
        className="flex flex-1 flex-col gap-6 p-4 lg:flex-row lg:p-6"
        onMouseLeave={() => setTimelineHover(null)}
      >
        <aside className="w-full shrink-0 lg:w-[320px] xl:w-[360px]">
          <ConfigPanel
            jsonText={jsonText}
            onJsonChange={setJsonText}
            schedulerOverride={schedulerOverride}
            onSchedulerChange={setSchedulerOverride}
            onSimulate={handleSimulate}
            resolvedHover={resolvedHover}
            onHoverChange={setTimelineHover}
          />
        </aside>

        <main className="min-w-0 flex-1">
          {!result || !config ? (
            <Card className="flex h-full min-h-[400px] items-center justify-center">
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <BarChart3 className="h-16 w-16 text-muted-foreground/50" />
                <div>
                  <p className="text-lg font-medium">Nenhuma simulação ainda</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Carregue um JSON ou use um exemplo para começar
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="timeline" className="space-y-4">
              <TabsList className="flex w-full flex-wrap">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                <TabsTrigger value="log">LOG</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline">
                <Card>
                  <CardContent className="pt-6">
                    <TimelineView
                      config={config}
                      result={result}
                      resolvedHover={resolvedHover}
                      onHoverChange={setTimelineHover}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats">
                <StatsPanel result={result} />
              </TabsContent>

              <TabsContent value="log">
                <LogExport result={result} />
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
