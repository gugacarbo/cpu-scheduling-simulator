import {
  AlarmClock,
  Clock,
  Cpu,
  Gauge,
  LogIn,
  Plus,
  Repeat,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  type AlgorithmParameter,
  type ParameterKey,
  getTaskParameters,
} from '@/lib/algorithm-parameters'
import { getTaskColor } from '@/lib/colors'
import {
  type RawTaskConfig,
  resolveSchedulerName,
  serializeSimulationConfig,
  simulationConfigSchema,
} from '@/lib/schema'
import type { SchedulerName } from '@/lib/types'

const PARAMETER_ICONS: Record<ParameterKey, LucideIcon> = {
  simulation_time: Clock,
  quantum: Gauge,
  offset: LogIn,
  computation_time: Cpu,
  period_time: Repeat,
  deadline: AlarmClock,
}

const DEFAULT_TASK: RawTaskConfig = {
  offset: 0,
  computation_time: 1,
  period_time: 10,
  quantum: 1,
  deadline: 10,
}

type EditorDraft = {
  simulation_time: number
  scheduler_name: string
  tasks: RawTaskConfig[]
}

const EMPTY_DRAFT: EditorDraft = {
  simulation_time: 20,
  scheduler_name: 'RR',
  tasks: [],
}

interface JsonGraphicalEditorProps {
  jsonText: string
  schedulerOverride: SchedulerName | null
  onJsonChange: (text: string) => void
}

function jsonToDraft(
  jsonText: string,
  schedulerOverride: SchedulerName | null,
): EditorDraft | null {
  if (!jsonText.trim()) {
    return {
      ...EMPTY_DRAFT,
      scheduler_name: schedulerOverride ?? EMPTY_DRAFT.scheduler_name,
    }
  }

  try {
    const raw = JSON.parse(jsonText) as unknown
    const result = simulationConfigSchema.safeParse(raw)
    if (!result.success) return null

    const { simulation_time, scheduler_name, tasks } = result.data
    return { simulation_time, scheduler_name, tasks }
  } catch {
    return null
  }
}

function publishDraft(draft: EditorDraft, onJsonChange: (text: string) => void) {
  if (draft.tasks.length === 0) {
    onJsonChange('')
    return
  }

  onJsonChange(serializeSimulationConfig(draft))
}

function ParameterHeader({ parameter }: { parameter: AlgorithmParameter }) {
  const Icon = PARAMETER_ICONS[parameter.key]

  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex items-center gap-1 text-xs font-medium">
        <Icon className="h-3 w-3 shrink-0" />
        <span>{parameter.label}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 flex-col items-start gap-0.5">
        <span className="font-medium">{parameter.label}</span>
        <span className="text-background/75">{parameter.explanation}</span>
      </TooltipContent>
    </Tooltip>
  )
}

function NumberField({
  value,
  min,
  onChange,
  className,
}: {
  value: number
  min?: number
  onChange: (value: number) => void
  className?: string
}) {
  return (
    <Input
      type="number"
      min={min}
      value={value}
      onChange={(event) => {
        const next = Number(event.target.value)
        if (!Number.isFinite(next)) return
        onChange(next)
      }}
      className={className}
    />
  )
}

export function JsonGraphicalEditor({
  jsonText,
  schedulerOverride,
  onJsonChange,
}: JsonGraphicalEditorProps) {
  const [draft, setDraft] = useState<EditorDraft>(() =>
    jsonToDraft(jsonText, schedulerOverride) ?? EMPTY_DRAFT,
  )

  useEffect(() => {
    const next = jsonToDraft(jsonText, schedulerOverride)
    if (next) setDraft(next)
  }, [jsonText, schedulerOverride])

  const parametersScheduler = resolveSchedulerName(
    draft.scheduler_name,
    schedulerOverride ?? 'RR',
  )
  const taskParameters = getTaskParameters(parametersScheduler)

  const updateDraft = useCallback(
    (updater: (current: EditorDraft) => EditorDraft) => {
      setDraft((current) => {
        const next = updater(current)
        publishDraft(next, onJsonChange)
        return next
      })
    },
    [onJsonChange],
  )

  const updateTask = (index: number, patch: Partial<RawTaskConfig>) => {
    updateDraft((current) => ({
      ...current,
      tasks: current.tasks.map((task, taskIndex) =>
        taskIndex === index ? { ...task, ...patch } : task,
      ),
    }))
  }

  const addTask = () => {
    updateDraft((current) => ({
      ...current,
      tasks: [...current.tasks, { ...DEFAULT_TASK }],
    }))
  }

  const removeTask = (index: number) => {
    updateDraft((current) => ({
      ...current,
      tasks: current.tasks.filter((_, taskIndex) => taskIndex !== index),
    }))
  }

  const hasInvalidJson = (() => {
    if (!jsonText.trim()) return false
    try {
      const raw = JSON.parse(jsonText) as unknown
      return !simulationConfigSchema.safeParse(raw).success
    } catch {
      return true
    }
  })()

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {hasInvalidJson ? (
        <p className="text-xs text-destructive">
          O JSON atual é inválido. Os valores abaixo usam o último rascunho válido ou o padrão.
        </p>
      ) : null}

      <div className="grid shrink-0 grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="editor-simulation-time" className="text-xs font-medium">
            Tempo de simulação
          </label>
          <NumberField
            value={draft.simulation_time}
            min={1}
            onChange={(simulation_time) => updateDraft((current) => ({ ...current, simulation_time }))}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="editor-process-name" className="text-xs font-medium">
            Nome do processo
          </label>
          <Input
            id="editor-process-name"
            value={draft.scheduler_name}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                scheduler_name: event.target.value,
              }))
            }
            placeholder="Ex: RR, EDF, Processo A"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex shrink-0 items-center justify-between">
          <p className="text-xs font-medium">Tarefas</p>
          <Button type="button" variant="outline" size="sm" onClick={addTask}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>

        <div className="min-h-32 flex-1 overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-2">#</TableHead>
                {taskParameters.map((parameter) => (
                  <TableHead key={parameter.key} className="px-2">
                    <ParameterHeader parameter={parameter} />
                  </TableHead>
                ))}
                <TableHead className="w-10 px-2" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {draft.tasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={taskParameters.length + 2}
                    className="py-6 text-center text-xs text-muted-foreground"
                  >
                    Nenhuma tarefa. Clique em Adicionar para gerar o JSON.
                  </TableCell>
                </TableRow>
              ) : (
                draft.tasks.map((task, index) => (
                  <TableRow key={index}>
                    <TableCell className="px-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: getTaskColor(index) }}
                        />
                        T{index}
                      </span>
                    </TableCell>
                    {taskParameters.map((parameter) => (
                      <TableCell key={parameter.key} className="px-2">
                        <NumberField
                          value={task[parameter.key as keyof RawTaskConfig] as number}
                          min={parameter.key === 'offset' ? 0 : 1}
                          onChange={(value) => updateTask(index, { [parameter.key]: value })}
                          className="h-7 w-16 px-1.5 text-xs tabular-nums"
                        />
                      </TableCell>
                    ))}
                    <TableCell className="px-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeTask(index)}
                        aria-label={`Remover tarefa T${index}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
