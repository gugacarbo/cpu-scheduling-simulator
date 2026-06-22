import { runSchedulerSimulation } from '@/schedulers/index'
import { loadFixture } from '../helpers/fixture-loader'
import { normalizeResult } from '../helpers/normalize-result'

const CASES = [
  'rr-three-tasks',
  'prr-priority-preempt',
  'rm-schedulable',
  'edf-deadline-miss',
] as const

const EPSILON = 1e-6

function expectCloseTo(actual: number, expected: number) {
  expect(actual).toBeCloseTo(expected, Math.abs(Math.log10(EPSILON)))
}

function expectExpectedOutput(
  actual: ReturnType<typeof normalizeResult>,
  expected: ReturnType<typeof normalizeResult>,
) {
  expect(actual.scheduler).toBe(expected.scheduler)
  expect(actual.schedulable).toBe(expected.schedulable)
  expectCloseTo(actual.utilization, expected.utilization)
  expect(actual.executionLog).toEqual(expected.executionLog)
  expectCloseTo(actual.systemTatAvg, expected.systemTatAvg)
  expectCloseTo(actual.systemWtAvg, expected.systemWtAvg)
  expect(actual.maxWtTaskId).toBe(expected.maxWtTaskId)
  expect(actual.minWtTaskId).toBe(expected.minWtTaskId)
  expect(actual.starvationTasks).toEqual(expected.starvationTasks)
  expect(actual.perTaskStats).toHaveLength(expected.perTaskStats.length)

  for (let i = 0; i < expected.perTaskStats.length; i++) {
    const actualStat = actual.perTaskStats[i]
    const expectedStat = expected.perTaskStats[i]
    expect(actualStat.taskId).toBe(expectedStat.taskId)
    expectCloseTo(actualStat.tatAvg, expectedStat.tatAvg)
    expectCloseTo(actualStat.wtAvg, expectedStat.wtAvg)
    expect(actualStat.jobsExecuted).toBe(expectedStat.jobsExecuted)
    if (expectedStat.deadlineMissRate !== undefined) {
      expect(actualStat.deadlineMissRate).toBeDefined()
      expectCloseTo(actualStat.deadlineMissRate!, expectedStat.deadlineMissRate!)
    }
  }

  if (expected.deadlineMisses) {
    expect(actual.deadlineMisses).toEqual(expected.deadlineMisses)
  } else {
    expect(actual.deadlineMisses).toBeUndefined()
  }
}

describe.each(CASES)('scheduler e2e: %s', (caseName) => {
  it('produz resultado estruturado esperado', () => {
    const fixture = loadFixture(caseName)
    const result = runSchedulerSimulation(fixture.config)
    const normalized = normalizeResult(result)

    expectExpectedOutput(normalized, fixture.expected)
  })

  it('produz log TXT esperado', () => {
    const fixture = loadFixture(caseName)
    const result = runSchedulerSimulation(fixture.config)

    expect(result.logText).toBe(fixture.expectedTxt)
  })
})
