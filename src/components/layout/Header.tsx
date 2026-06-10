import { Cpu, Moon, Sun } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isRealtimeScheduler } from '@/lib/colors'
import type { SimulationResult } from '@/lib/types'
import { cn } from '@/lib/utils'

interface HeaderProps {
  result: SimulationResult | null
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({ result, theme, onToggleTheme }: HeaderProps) {
  const utilizationOk = result ? result.utilization <= 1 : true

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <Cpu className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold md:text-xl">CPU Scheduling Simulator</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {result && (
          <>
            <Badge variant="outline">{result.simulationTime} unidades</Badge>
            <Badge
              className={cn(
                isRealtimeScheduler(result.scheduler)
                  ? 'bg-blue-600 text-white hover:bg-blue-600'
                  : 'bg-emerald-600 text-white hover:bg-emerald-600',
              )}
            >
              {result.scheduler}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                utilizationOk
                  ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
                  : 'border-amber-500 text-amber-700 dark:text-amber-400',
              )}
            >
              U = {result.utilization.toFixed(2)}
            </Badge>
          </>
        )}
        <Button variant="outline" size="icon" onClick={onToggleTheme} aria-label="Alternar tema">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
