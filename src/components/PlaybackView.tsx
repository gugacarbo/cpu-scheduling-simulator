import { Pause, Play, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GanttChart } from '@/components/GanttChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import type { SimulationConfig, SimulationResult } from '@/lib/types'

interface PlaybackViewProps {
  config: SimulationConfig
  result: SimulationResult
}

const SPEED_OPTIONS = [
  { value: '0.5', label: '0.5x' },
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '4', label: '4x' },
]

export function PlaybackView({ config, result }: PlaybackViewProps) {
  const slices = result.executionLog
  const maxSlice = Math.max(0, slices.length - 1)
  const [sliceIndex, setSliceIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState('1')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentSlice = slices[sliceIndex]
  const currentTime = currentSlice?.start ?? 0

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!playing) {
      clearTimer()
      return
    }

    const intervalMs = 500 / Number.parseFloat(speed)
    timerRef.current = setInterval(() => {
      setSliceIndex((current) => {
        if (current >= maxSlice) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, intervalMs)

    return clearTimer
  }, [playing, speed, maxSlice, clearTimer])

  useEffect(() => () => clearTimer(), [clearTimer])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-6">
          <Button variant="outline" size="icon" onClick={() => setSliceIndex(0)}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSliceIndex((current) => Math.max(0, current - 1))}
          >
            <StepBack className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setPlaying((current) => !current)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSliceIndex((current) => Math.min(maxSlice, current + 1))}
          >
            <StepForward className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setSliceIndex(maxSlice)}>
            <SkipForward className="h-4 w-4" />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Velocidade</span>
            <Select value={speed} onValueChange={(value) => value && setSpeed(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPEED_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
            <span>
              Tempo: {currentTime} / {config.simulation_time}
            </span>
            <span>
              Fatia {slices.length === 0 ? 0 : sliceIndex + 1} de {slices.length}
            </span>
          </div>

          <Slider
            value={[sliceIndex]}
            min={0}
            max={maxSlice}
            step={1}
            onValueChange={(value) => {
              setPlaying(false)
              const next = Array.isArray(value) ? value[0] : value
              setSliceIndex(next)
            }}
          />

          <GanttChart
            config={config}
            result={result}
            currentTime={currentTime}
            activeSliceIndex={sliceIndex}
          />
        </div>

        <Card className="lg:w-64 shrink-0">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Agora executando</p>
            {currentSlice ? (
              <div className="mt-2 space-y-1">
                <p className="text-2xl font-semibold">{currentSlice.taskId}</p>
                <p className="text-sm">Job #{currentSlice.jobIndex}</p>
                <p className="text-sm text-muted-foreground">
                  [{currentSlice.start}, {currentSlice.end})
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma fatia selecionada</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
