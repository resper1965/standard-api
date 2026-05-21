import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, Terminal, Loader2, Play } from "lucide-react"
import { useJobPolling } from "@/hooks/use-job-polling"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export function PlaygroundPage() {
  const { toast } = useToast()
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([
    "~> [System] Worker telemetry initialized. Ready to dispatch.",
  ])

  const { job, isPolling, error } = useJobPolling(activeJobId, 3000)

  const appendLog = (msg: string) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1)
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`])
  }

  const handleDispatch = async () => {
    try {
      appendLog("Initiating Council Dispatch...")
      // We generate random UUIDs just for simulation purposes as requested by API schema
      const randomUuid = crypto.randomUUID()
      
      const payload = {
        assessment_id: randomUuid,
        target_framework_id: randomUuid,
        agents: ["incident_triager", "poam_architect"],
        input: { context: "Simulated load from Playground UI" }
      }

      const res = await api<{ status: string; job_id: string; message: string }>(
        "/api/v1/intelligence/council",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )

      appendLog(`Response: 202 Accepted. Job ID assigned: ${res.job_id}`)
      appendLog("Background worker assigned. Polling started...")
      setActiveJobId(res.job_id)

    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err)
      appendLog(`[ERROR] Dispatch failed: ${msg}`)
      toast({
        title: "Dispatch Failed",
        description: msg,
        variant: "destructive",
      })
    }
  }

  // React to hook changes to update logs visually
  if (job && job.status === 'completed' && !logs.some(l => l.includes('Job Completed O.K.'))) {
     appendLog(`Job Completed O.K. Duration recorded. Output keys: ${Object.keys(job.output || {}).join(", ")}`)
  } else if (job && job.status === 'failed' && !logs.some(l => l.includes('Job Failed'))) {
     appendLog(`Job Failed: ${job.error || 'Unknown fatal error in queue'}`)
  } else if (error && !logs.some(l => l.includes(`Polling error`))) {
     appendLog(`Polling error: ${error.message}`)
  } else if (isPolling && job?.status === 'pending' && logs.length % 3 === 0) {
     // Just to simulate long running logs safely without infinite renders
     // appendLog(`Worker ping... status is ${job.status}`)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Simulate agent runtimes and massive document ingestion asynchronous pipeline.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-accent/40 bg-card/60 flex flex-col">
          <CardHeader>
            <CardTitle className="text-accent flex items-center">
              <UploadCloud className="mr-2 h-5 w-5" /> Async Job Dispatcher
            </CardTitle>
            <CardDescription>
              Trigger the intelligence council and test the Durable Claim-Check polling architecture in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-accent/20 rounded-lg bg-black/20 mb-4 flex-1">
              {isPolling ? (
                <>
                  <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
                  <p className="font-medium text-sm text-center text-accent">Council is currently deliberating...</p>
                  <p className="text-xs text-muted-foreground mt-2">Job ID: {activeJobId?.split('-')[0]}...</p>
                </>
              ) : (
                <>
                  <Play className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                  <p className="font-medium text-sm text-center">Ready to dispatch agents into the background job queue</p>
                  {job?.status === 'completed' && (
                    <p className="text-xs text-green-500 mt-2 font-bold">Last Job Successful!</p>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end mt-auto">
               <Button 
                 onClick={handleDispatch}
                 disabled={isPolling}
                 className="bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-accent"
               >
                 {isPolling ? 'Processing...' : 'Dispatch Council'}
               </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <Terminal className="mr-2 h-5 w-5" /> Worker Telemetry
            </CardTitle>
            <CardDescription>
              Live streaming from Polling endpoint monitoring the job queue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto bg-black rounded-lg border border-border p-4 font-mono text-xs text-green-500/80 break-words whitespace-pre-wrap flex flex-col">
              {logs.map((log, idx) => (
                <div key={idx} className={`mb-1 ${log.includes('[ERROR]') ? 'text-destructive' : ''} ${log.includes('Completed') ? 'text-accent' : ''}`}>
                  {log}
                </div>
              ))}
              {isPolling && (
                <div className="mt-2 text-muted-foreground animate-pulse">
                  Polling status from /api/v1/jobs/{activeJobId?.split('-')[0]}... ({job?.status || 'awaiting connection'})
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
