import { CheckCircle2, CircleHelp, XCircle } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { isRealtimeScheduler } from '@/lib/colors'
import type { SimulationResult } from '@/lib/types'

interface StatsPanelProps {
  result: SimulationResult
}

interface StatLabelProps {
  label: string
  explanation: string
}

function StatLabel({ label, explanation }: StatLabelProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="inline-flex max-w-full items-center gap-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-label={label}
      >
        <span className="truncate">{label}</span>
        <CircleHelp className="h-3 w-3 shrink-0 opacity-60" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 flex-col items-start gap-0.5">
        <span className="font-medium">{label}</span>
        <span className="text-background/75">{explanation}</span>
      </TooltipContent>
    </Tooltip>
  )
}

export function StatsPanel({ result }: StatsPanelProps) {
  const isRealtime = isRealtimeScheduler(result.scheduler)
  const utilizationPercent = Math.min(result.utilization * 100, 100)

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Card size="sm">
          <CardHeader className="gap-0 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              <StatLabel
                label="Utilização"
                explanation="Fator de utilização da CPU (U): proporção do tempo em que o processador está ocupado executando tarefas."
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-lg font-semibold tabular-nums">U = {result.utilization.toFixed(2)}</p>
            <Progress value={utilizationPercent} className="mt-1.5 h-1.5" />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="gap-0 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              <StatLabel
                label="TAT médio do sistema"
                explanation="Turnaround Time médio: tempo médio desde a chegada do job até sua conclusão."
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-lg font-semibold tabular-nums">{result.systemTatAvg.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">unidades de tempo</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="gap-0 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              <StatLabel
                label="WT médio do sistema"
                explanation="Waiting Time médio: tempo médio que cada job passa na fila de prontos, aguardando a CPU."
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-lg font-semibold tabular-nums">{result.systemWtAvg.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">unidades de tempo</p>
          </CardContent>
        </Card>

        {isRealtime && (
          <Card size="sm">
            <CardHeader className="gap-0 pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                <StatLabel
                  label="Escalonável"
                  explanation="Indica se o conjunto de tarefas periódicas atende à taxa de utilização exigida pelo escalonador em tempo real."
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="flex items-center gap-1.5">
                {result.schedulable ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <p className="text-lg font-semibold">{result.schedulable ? 'Sim' : 'Não'}</p>
              </div>
              {result.schedulabilityNote && (
                <p className="mt-1 text-[10px] text-muted-foreground">{result.schedulabilityNote}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card size="sm">
          <CardHeader className="gap-0 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              <StatLabel
                label="Maior WT médio"
                explanation="Tarefa com o maior tempo médio de espera (WT) entre todas as tarefas do sistema."
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-lg font-semibold">{result.maxWtTaskId ?? '—'}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="gap-0 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              <StatLabel
                label="Menor WT médio"
                explanation="Tarefa com o menor tempo médio de espera (WT) entre todas as tarefas do sistema."
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-lg font-semibold">{result.minWtTaskId ?? '—'}</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="gap-0 pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              <StatLabel
                label="Starvation"
                explanation="Indica tarefas que podem esperar indefinidamente por CPU sem nunca ser escalonadas."
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-lg font-semibold">
              {result.starvationTasks.length === 0 ? 'Nenhuma' : result.starvationTasks.join(', ')}
            </p>
          </CardContent>
        </Card>

        {isRealtime && result.deadlineMisses && (
          <Card size="sm">
            <CardHeader className="gap-0 pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                <StatLabel
                  label="Deadline miss (sistema)"
                  explanation="Percentual de jobs no sistema que concluíram após o prazo (deadline)."
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-lg font-semibold tabular-nums">
                {result.deadlineMisses.system.toFixed(1)}%
              </p>
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
