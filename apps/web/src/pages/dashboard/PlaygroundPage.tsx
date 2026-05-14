import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, Terminal } from "lucide-react"

export function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Simulate agent runtimes and massive document ingestion asynchronous pipeline.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-accent/40 bg-card/60">
          <CardHeader>
            <CardTitle className="text-accent flex items-center">
              <UploadCloud className="mr-2 h-5 w-5" /> Ingestion Dropzone
            </CardTitle>
            <CardDescription>
              Drag your massive dataset here (ZIPs, PDFs, Excel). This queues up workers in the background.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-accent/20 rounded-lg hover:border-accent/50 transition-colors cursor-pointer bg-black/20">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="font-medium text-sm text-center">Click or Drag & Drop massive data payloads here</p>
              <p className="text-xs text-muted-foreground mt-2">Up to 10GB per batch under Standard SaaS mode</p>
            </div>
            <div className="mt-4 flex justify-end">
               <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                 Trigger Async Ingest
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
              Live streaming from Cloudflare Queues for processing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto bg-black rounded-lg border border-border p-4 font-mono text-xs text-green-500/80">
              <div className="mb-2">~{">"} [System] Waiting for jobs...</div>
              {/* Fake logs to represent the async operation feeling */}
              <div className="opacity-50 text-muted-foreground">No recent ingestion bursts detected.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
