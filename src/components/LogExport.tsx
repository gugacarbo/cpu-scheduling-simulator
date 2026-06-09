import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { buildLogFilename } from '@/lib/log-formatter'
import type { SimulationResult } from '@/lib/types'

interface LogExportProps {
  result: SimulationResult
}

export function LogExport({ result }: LogExportProps) {
  const filename = buildLogFilename(result.scheduler)

  const handleDownload = () => {
    const blob = new Blob([result.logText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Arquivo de saída</CardTitle>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Baixar .txt
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[480px] rounded-md border bg-muted p-4">
          <pre className="whitespace-pre-wrap font-mono text-xs">{result.logText}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
