import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, AlertTriangle, Info, ShieldAlert, CheckCircle2, Bot } from "lucide-react"

export type GapFindingProps = {
  finding: {
    gap_code: string
    severity: "informational" | "low" | "medium" | "high" | "critical"
    gap_summary: string
    recommendation_summary?: string
    is_mcr_gap?: boolean
    source_chunks?: string[]
    // Simulando que o payload possa trazer detalhes dos chunks (ou podemos ter um endpoint/hook para buscar os trechos de texto)
    chunk_details?: Array<{ id: string; snippet: string; reranked?: boolean }>
  }
}

export function GapFindingCard({ finding }: GapFindingProps) {
  const severityColors = {
    informational: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    low: "bg-green-500/10 text-green-500 border-green-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
  }

  const severityIcons = {
    informational: <Info className="h-4 w-4" />,
    low: <CheckCircle2 className="h-4 w-4" />,
    medium: <AlertTriangle className="h-4 w-4" />,
    high: <ShieldAlert className="h-4 w-4" />,
    critical: <ShieldAlert className="h-4 w-4" />,
  }

  return (
    <Card className="border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{finding.gap_code}</CardTitle>
            {finding.is_mcr_gap && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                MCR Blocker
              </Badge>
            )}
          </div>
          <CardDescription className="text-sm text-foreground/80 font-medium">
            {finding.gap_summary}
          </CardDescription>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold capitalize shrink-0 ${
            severityColors[finding.severity]
          }`}
        >
          {severityIcons[finding.severity]}
          {finding.severity}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {finding.recommendation_summary && (
          <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-sm">
            <p className="font-semibold text-xs text-muted-foreground mb-1">Recommendation</p>
            <p>{finding.recommendation_summary}</p>
          </div>
        )}

        {/* Explicabilidade RAG */}
        {finding.source_chunks && finding.source_chunks.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Evidence Sources ({finding.source_chunks.length})
              </p>
              {finding.chunk_details?.some((c) => c.reranked) && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                  <Bot className="h-3 w-3" />
                  AI Reranked
                </div>
              )}
            </div>

            <div className="grid gap-2">
              {finding.chunk_details ? (
                finding.chunk_details.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="text-xs p-2.5 rounded-md bg-background border border-border/60 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-mono text-[10px]">{chunk.id.split("-")[0]}...</span>
                      {chunk.reranked && (
                        <span className="text-[9px] text-emerald-500/80 font-semibold tracking-wide">
                          RERANKED
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/70 line-clamp-2 leading-relaxed">"{chunk.snippet}"</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Sources are available via API payload.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
