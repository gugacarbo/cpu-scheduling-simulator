import { CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { isRealtimeScheduler } from '@/lib/colors'
import type { SimulationResult } from '@/lib/types'

interface StatsPanelProps {
  result: SimulationResult
}

export function StatsPanel({ result }: StatsPanelProps) {
  const isRealtime = isRealtimeScheduler(result.scheduler)
  const utilizationPercent = Math.min(result.utilization * 100, 100)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilização</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">U = {result.utilization.toFixed(2)}</p>
            <Progress value={utilizationPercent} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              TAT médio do sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{result.systemTatAvg.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">unidades de tempo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              WT médio do sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{result.systemWtAvg.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">unidades de tempo</p>
          </CardContent>
        </Card>

        {isRealtime && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Escalonável
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {result.schedulable ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive" />
                )}
                <p className="text-2xl font-semibold">{result.schedulable ? 'Sim' : 'Não'}</p>
              </div>
              {result.schedulabilityNote && (
                <p className="mt-2 text-xs text-muted-foreground">{result.schedulabilityNote}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maior WT médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{result.maxWtTaskId ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menor WT médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{result.minWtTaskId ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Starvation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {result.starvationTasks.length === 0 ? 'Nenhuma' : result.starvationTasks.join(', ')}
            </p>
          </CardContent>
        </Card>

        {isRealtime && result.deadlineMisses && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Deadline miss (sistema)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{result.deadlineMisses.system.toFixed(1)}%</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estatísticas por tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>TAT_avg^n</TableHead>
                <TableHead>WT_avg^n</TableHead>
                {isRealtime && <TableHead>% deadline miss</TableHead>}
                <TableHead>Jobs executados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.perTaskStats.map((stat) => (
                <TableRow key={stat.taskId}>
                  <TableCell className="font-medium">{stat.taskId}</TableCell>
                  <TableCell>{stat.tatAvg.toFixed(2)}</TableCell>
                  <TableCell>{stat.wtAvg.toFixed(2)}</TableCell>
                  {isRealtime && <TableCell>{(stat.deadlineMissRate ?? 0).toFixed(1)}%</TableCell>}
                  <TableCell>{stat.jobsExecuted}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
