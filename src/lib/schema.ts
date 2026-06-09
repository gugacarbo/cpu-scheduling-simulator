import { z } from 'zod'
import type { SchedulerName, SimulationConfig, TaskConfig } from './types'

const schedulerNameSchema = z.enum(['RR', 'PRR', 'RR_PRIORITY', 'RM', 'EDF'])

const taskSchema = z.object({
  offset: z.number().min(0),
  computation_time: z.number().positive(),
  period_time: z.number().positive(),
  quantum: z.number().positive(),
  deadline: z.number().positive(),
})

export const simulationConfigSchema = z.object({
  simulation_time: z.number().positive(),
  scheduler_name: z.string().min(1),
  tasks: z.array(taskSchema).min(1),
})

export type RawSimulationConfig = z.infer<typeof simulationConfigSchema>
export type RawTaskConfig = z.infer<typeof taskSchema>

export function isSchedulerName(value: string): value is SchedulerName {
  return schedulerNameSchema.safeParse(value).success
}

export function resolveSchedulerName(
  name: string,
  fallback: SchedulerName = 'RR',
): SchedulerName {
  if (name === 'RR_PRIORITY') return 'PRR'
  if (isSchedulerName(name)) return name
  return fallback
}

export function serializeSimulationConfig(config: RawSimulationConfig): string {
  return JSON.stringify(config, null, 2)
}

export function normalizeSchedulerName(name: SchedulerName): SchedulerName {
  return name === 'RR_PRIORITY' ? 'PRR' : name
}

export function parseSimulationConfig(raw: unknown): SimulationConfig {
  const parsed = simulationConfigSchema.parse(raw)
  const scheduler_name = resolveSchedulerName(parsed.scheduler_name)

  const tasks: TaskConfig[] = parsed.tasks.map((task, index) => ({
    id: `T${index}`,
    ...task,
  }))

  return {
    simulation_time: parsed.simulation_time,
    scheduler_name,
    tasks,
  }
}

export function validateSimulationConfigJson(text: string):
  | {
      success: true
      data: SimulationConfig
    }
  | {
      success: false
      errors: string[]
    } {
  try {
    const raw = JSON.parse(text) as unknown
    const result = simulationConfigSchema.safeParse(raw)
    if (!result.success) {
      return {
        success: false,
        errors: result.error.issues.map(
          (issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
        ),
      }
    }
    return { success: true, data: parseSimulationConfig(result.data) }
  } catch {
    return { success: false, errors: ['JSON inválido: verifique a sintaxe do arquivo.'] }
  }
}
