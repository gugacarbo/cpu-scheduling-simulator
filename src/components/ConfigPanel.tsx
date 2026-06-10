import {
  AlarmClock,
  ChevronDown,
  Clock,
  Cpu,
  FileJson,
  Gauge,
  Layers,
  LayoutList,
  Loader2,
  LogIn,
  type LucideIcon,
  Play,
  Repeat,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AlgorithmFlowchart } from '@/components/AlgorithmFlowchart'
import { JsonGraphicalEditor } from '@/components/JsonGraphicalEditor'
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getAlgorithmDescription } from '@/lib/algorithm-descriptions'
import {
  type AlgorithmParameter,
  getTaskParameters,
  getTaskParameterValue,
  type ParameterKey,
} from '@/lib/algorithm-parameters'
import { getTaskColor } from '@/lib/colors'
import { validateSimulationConfigJson } from '@/lib/schema'
import {
  handleTimelineHoverLeave,
  type ResolvedTimelineHighlight,
  TIMELINE_HOVER_ZONE_ATTR,
  type TimelineHoverState,
} from '@/lib/timeline-hover'
import type { SchedulerName, SimulationConfig, TaskConfig } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SCHEDULER_OPTIONS } from '@/schedulers'

const AUTO_SIMULATE_MAX_TASKS = 10
const AUTO_SIMULATE_MAX_SIMULATION_TIME = 100
const AUTO_SIMULATE_DEBOUNCE_MS = 300

const EXAMPLE_PRESETS = {
  rr: {
    path: `${import.meta.env.BASE_URL}examples/rr-example.json`,
    scheduler: 'RR' as const,
    label: 'Round Robin (RR)',
  },
  edf: {
    path: `${import.meta.env.BASE_URL}examples/edf-example.json`,
    scheduler: 'EDF' as const,
    label: 'Earliest Deadline First (EDF)',
  },
} as const

type ExamplePreset = keyof typeof EXAMPLE_PRESETS

function requiresManualSimulate(config: SimulationConfig): boolean {
  return (
    config.tasks.length >= AUTO_SIMULATE_MAX_TASKS ||
    config.simulation_time > AUTO_SIMULATE_MAX_SIMULATION_TIME
  )
}

interface ConfigPanelProps {
  jsonText: string
  onJsonChange: (text: string) => void
  schedulerOverride: SchedulerName | null
  onSchedulerChange: (scheduler: SchedulerName) => void
  onSimulate: (config: SimulationConfig) => void
  resolvedHover?: ResolvedTimelineHighlight | null
  onHoverChange?: (hover: TimelineHoverState) => void
}

function JsonValidationAlert({ errors }: { errors: string[] }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>JSON inválido</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-inside list-disc text-sm">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

const PARAMETER_ICONS: Record<ParameterKey, LucideIcon> = {
  simulation_time: Clock,
  quantum: Gauge,
  offset: LogIn,
  computation_time: Cpu,
  period_time: Repeat,
  deadline: AlarmClock,
}

function TaskParameterCard({
  task,
  taskIndex,
  parameters,
  highlighted,
  onHoverChange,
}: {
  task: TaskConfig
  taskIndex: number
  parameters: AlgorithmParameter[]
  highlighted: boolean
  onHoverChange: (hover: TimelineHoverState) => void
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: task row drives linked hover highlight
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-background/60 px-2 py-1.5 transition-colors duration-150',
        highlighted && 'bg-primary/10 ring-1 ring-inset ring-primary/30',
      )}
      {...{ [TIMELINE_HOVER_ZONE_ATTR]: '' }}
      onMouseEnter={() => onHoverChange({ source: 'task', taskId: task.id })}
      onMouseLeave={(e) => handleTimelineHoverLeave(e, onHoverChange)}
    >
      <div className="flex shrink-0 items-center gap-1">
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-sm"
          style={{ backgroundColor: getTaskColor(taskIndex) }}
        />
        <span className="text-xs font-medium text-foreground">{task.id}</span>
      </div>
      {parameters.map((parameter) => {
        const Icon = PARAMETER_ICONS[parameter.key]
        return (
          <div key={parameter.key} className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                aria-label={parameter.label}
              >
                <Icon className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-56 flex-col items-start gap-0.5">
                <span className="font-medium">{parameter.label}</span>
                <span className="text-background/75">{parameter.explanation}</span>
              </TooltipContent>
            </Tooltip>
            <span className="text-[10px] font-medium tabular-nums text-foreground">
              {getTaskParameterValue(parameter.key, task)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function ConfigPanel({
  jsonText,
  onJsonChange,
  schedulerOverride,
  onSchedulerChange,
  onSimulate,
  resolvedHover,
  onHoverChange,
}: ConfigPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const skipAutoSimulateRef = useRef(false)
  const [dragOver, setDragOver] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDraftText, setDialogDraftText] = useState('')
  const dialogDraftRef = useRef(dialogDraftText)
  const dialogOpenRef = useRef(dialogOpen)
  dialogDraftRef.current = dialogDraftText
  dialogOpenRef.current = dialogOpen
  const [dialogView, setDialogView] = useState<'form' | 'json'>('form')
  const [showSimulateError, setShowSimulateError] = useState(false)
  const [flowchartOpen, setFlowchartOpen] = useState(false)
  const [isSimulating, startSimulateTransition] = useTransition()
  const validation = useMemo(
    () => (jsonText.trim() ? validateSimulationConfigJson(jsonText) : null),
    [jsonText],
  )
  const dialogValidation = useMemo(
    () => (dialogDraftText.trim() ? validateSimulationConfigJson(dialogDraftText) : null),
    [dialogDraftText],
  )

  const effectiveScheduler =
    schedulerOverride ?? (validation?.success ? validation.data.scheduler_name : 'EDF')

  const selectedSchedulerLabel =
    SCHEDULER_OPTIONS.find((option) => option.value === effectiveScheduler)?.label ??
    effectiveScheduler

  const algorithmDescription = getAlgorithmDescription(effectiveScheduler)
  const taskParameters = getTaskParameters(effectiveScheduler)
  const hasValidConfig = validation?.success === true
  const hasTasks = hasValidConfig && validation.data.tasks.length > 0
  const showManualSimulate = hasValidConfig && requiresManualSimulate(validation.data)

  const autoSimulateConfig = useMemo((): SimulationConfig | null => {
    if (!validation?.success || requiresManualSimulate(validation.data)) {
      return null
    }
    return {
      ...validation.data,
      scheduler_name: effectiveScheduler,
    }
  }, [validation, effectiveScheduler])

  useEffect(() => {
    if (!autoSimulateConfig || dialogOpen) return
    if (skipAutoSimulateRef.current) {
      skipAutoSimulateRef.current = false
      return
    }

    const timer = window.setTimeout(() => {
      if (dialogOpenRef.current) return
      onSimulate(autoSimulateConfig)
    }, AUTO_SIMULATE_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [autoSimulateConfig, onSimulate, dialogOpen])

  useEffect(() => {
    if (!hasTasks) setFlowchartOpen(false)
  }, [hasTasks])

  const commitDialogDraft = useCallback(() => {
    const draft = dialogDraftRef.current
    onJsonChange(draft)
    const nextValidation = draft.trim() ? validateSimulationConfigJson(draft) : null
    if (nextValidation?.success) {
      onSchedulerChange(nextValidation.data.scheduler_name)
    }
  }, [onJsonChange, onSchedulerChange])

  const openDialog = useCallback(() => {
    setDialogDraftText(jsonText)
    setDialogOpen(true)
  }, [jsonText])

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setDialogDraftText(jsonText)
        setDialogOpen(true)
        return
      }
      setDialogView('form')
      setDialogOpen(false)
      commitDialogDraft()
    },
    [jsonText, commitDialogDraft],
  )

  const handleFile = useCallback(
    (file: File, target: 'committed' | 'draft' = 'committed') => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result !== 'string') return
        if (target === 'draft') {
          setDialogDraftText(reader.result)
        } else {
          onJsonChange(reader.result)
        }
      }
      reader.readAsText(file)
    },
    [onJsonChange],
  )

  const loadExample = useCallback(
    async (name: ExamplePreset) => {
      const preset = EXAMPLE_PRESETS[name]
      const response = await fetch(preset.path)
      const text = await response.text()
      const nextValidation = validateSimulationConfigJson(text)

      if (dialogOpenRef.current) {
        setDialogDraftText(text)
      } else {
        onJsonChange(text)
        onSchedulerChange(preset.scheduler)
      }
      setShowSimulateError(false)

      if (nextValidation?.success) {
        skipAutoSimulateRef.current = true
        const config = {
          ...nextValidation.data,
          scheduler_name: preset.scheduler,
        }
        startSimulateTransition(() => {
          onSimulate(config)
        })
      }
    },
    [onJsonChange, onSchedulerChange, onSimulate],
  )

  const handleManualSimulate = () => {
    if (!validation?.success) {
      setShowSimulateError(true)
      return
    }
    setShowSimulateError(false)
    const config = {
      ...validation.data,
      scheduler_name: effectiveScheduler,
    }
    startSimulateTransition(() => {
      onSimulate(config)
    })
  }

  return (
    <Card size="sm">
      <CardHeader className="gap-2 border-b border-border">
        <CardTitle>Configuração</CardTitle>
        <div className="flex gap-2">
          <ButtonGroup className="min-w-0 flex-1">
            <Button variant="outline" size="sm" className="min-w-0 flex-1" onClick={openDialog}>
              <FileJson className="mr-1.5 h-3.5 w-3.5 shrink-0" />
              {hasTasks ? 'Editar Tasks' : 'Adicionar Tasks'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2!"
                    aria-label="Carregar exemplo"
                  />
                }
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {(Object.keys(EXAMPLE_PRESETS) as ExamplePreset[]).map((id) => (
                  <DropdownMenuItem key={id} onClick={() => loadExample(id)}>
                    {EXAMPLE_PRESETS[id].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
          {showManualSimulate ? (
            <Button
              className="min-w-0 flex-1"
              size="sm"
              disabled={isSimulating}
              onClick={handleManualSimulate}
            >
              {isSimulating ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <Play className="mr-2 h-3.5 w-3.5 shrink-0" />
              )}
              Simular
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div
          className={cn('space-y-2', !hasTasks && 'pointer-events-none opacity-50')}
          aria-disabled={!hasTasks}
        >
          <div className="w-full space-y-1">
            <label
              htmlFor="scheduler-select"
              className={cn('text-sm font-medium', !hasTasks && 'text-muted-foreground')}
            >
              Algoritmo
            </label>
            <Select
              value={effectiveScheduler}
              disabled={!hasTasks}
              onValueChange={(value) => {
                if (value) onSchedulerChange(value as SchedulerName)
              }}
            >
              <SelectTrigger id="scheduler-select" className="h-8 w-full" disabled={!hasTasks}>
                <SelectValue>{selectedSchedulerLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SCHEDULER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50 disabled:no-underline"
            aria-expanded={flowchartOpen}
            disabled={!hasTasks}
            onClick={() => setFlowchartOpen((open) => !open)}
          >
            {flowchartOpen ? 'Ocultar' : 'Detalhes'}
          </button>

          {hasTasks ? (
            <Accordion
              value={flowchartOpen ? ['details'] : []}
              onValueChange={(value) => setFlowchartOpen(value.includes('details'))}
              className="border-0"
            >
              <AccordionItem value="details" className="border-0">
                <AccordionContent className="space-y-3 pt-1 pb-0">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {algorithmDescription.body}
                  </p>
                  <AlgorithmFlowchart key={effectiveScheduler} scheduler={effectiveScheduler} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
        </div>

        {validation && !validation.success ? (
          <Badge variant="destructive">JSON inválido</Badge>
        ) : null}

        {showSimulateError && validation && !validation.success && (
          <JsonValidationAlert errors={validation.errors} />
        )}
      </CardContent>

      {hasValidConfig && validation?.success ? (
        <CardFooter className="flex-col items-start gap-3">
          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3 w-3 shrink-0" aria-hidden="true" />
              {validation.data.tasks.length} tarefa{validation.data.tasks.length === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              {validation.data.simulation_time}u
            </span>
          </div>

          {taskParameters.length > 0 && (
            <div className="w-full space-y-1">
              {validation.data.tasks.map((task, index) => (
                <TaskParameterCard
                  key={task.id}
                  task={task}
                  taskIndex={index}
                  parameters={taskParameters}
                  highlighted={resolvedHover?.taskIds.has(task.id) ?? false}
                  onHoverChange={onHoverChange ?? (() => {})}
                />
              ))}
            </div>
          )}
        </CardFooter>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex h-[520px] max-h-[calc(100svh-2rem)] flex-col gap-3 overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0 flex-row items-center justify-between gap-2 space-y-0 pr-8">
            <DialogTitle>Configurar simulação</DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogView((view) => (view === 'form' ? 'json' : 'form'))}
              aria-label={
                dialogView === 'form' ? 'Alternar para modo JSON' : 'Alternar para modo formulário'
              }
            >
              {dialogView === 'form' ? (
                <>
                  <FileJson className="mr-1.5 h-3.5 w-3.5" />
                  JSON
                </>
              ) : (
                <>
                  <LayoutList className="mr-1.5 h-3.5 w-3.5" />
                  Formulário
                </>
              )}
            </Button>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {dialogView === 'form' ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <JsonGraphicalEditor
                  jsonText={dialogDraftText}
                  schedulerOverride={schedulerOverride}
                  onJsonChange={(text) => {
                    setDialogDraftText(text)
                    setShowSimulateError(false)
                  }}
                />
              </div>
            ) : (
              <div
                className={`flex min-h-0 flex-1 flex-col rounded-lg border transition-colors ${
                  dragOver ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-input'
                }`}
              >
                <Textarea
                  value={dialogDraftText}
                  onChange={(event) => {
                    setDialogDraftText(event.target.value)
                    setShowSimulateError(false)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDragOver(false)
                    const file = event.dataTransfer.files[0]
                    if (file) handleFile(file, 'draft')
                  }}
                  placeholder='{ "simulation_time": 14, "scheduler_name": "EDF", "tasks": [...] }'
                  className="min-h-0 flex-1 resize-none overflow-y-auto border-0 font-mono text-xs shadow-none focus-visible:ring-0"
                />
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => loadExample('edf')}
            >
              Exemplo EDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => loadExample('rr')}
            >
              Exemplo RR
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Selecionar arquivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleFile(file, 'draft')
              }}
            />
          </div>

          {dialogValidation && !dialogValidation.success && (
            <div className="max-h-24 shrink-0 overflow-y-auto">
              <JsonValidationAlert errors={dialogValidation.errors} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
