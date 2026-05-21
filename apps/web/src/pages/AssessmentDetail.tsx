import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  History, 
  Shield, 
  ChevronRight,
  Clock,
  User,
  Zap
} from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";

interface AssessmentDetails {
  assessment_id: string;
  name: string;
  scf_version_id: string;
  status: "draft" | "in_review" | "completed";
  progress: number;
  last_updated: string;
}

interface LifecycleEvent {
  event_type: string;
  previous_state: string;
  next_state: string;
  timestamp: string;
  reason?: string;
  actor_id: string;
}

export function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<AssessmentDetails | null>(null);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [gapCount, setGapCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      if (!id) return;
      try {
        const [assRes, eventsRes] = await Promise.all([
          api<AssessmentDetails>(`/api/v1/assessments/${id}`),
          api<{ data: LifecycleEvent[] }>(`/api/v1/assessments/${id}/events`)
        ]);
        setAssessment(assRes);
        setEvents(eventsRes?.data || []);

        // Fetch live stats in parallel (best-effort — don't block render)
        Promise.allSettled([
          api<{ data: unknown[] }>(`/api/v1/assessments/${id}/documents`),
          api<{ data: { id: string }[] }>(`/api/v1/assessments/${id}/gap-analysis`)
        ]).then(([docsResult, gapResult]) => {
          if (docsResult.status === "fulfilled") {
            setDocCount(docsResult.value?.data?.length ?? 0);
          }
          if (gapResult.status === "fulfilled") {
            const versions = gapResult.value?.data ?? [];
            setGapCount(versions.length > 0 ? versions.length : 0);
          }
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id]);

  const actorCount = useMemo(() => {
    const unique = new Set(events.map(e => e.actor_id).filter(Boolean));
    return unique.size;
  }, [events]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-20 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (!assessment) return (
    <div className="flex flex-col items-center justify-center p-20 text-center">
      <Shield className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
      <h2 className="text-xl font-bold">Assessment not found</h2>
      <Button variant="link" onClick={() => navigate('/assessments')}>Return to list</Button>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "in_review": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/assessments')} className="rounded-full h-10 w-10 border border-border/50 glass">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
           <div className="flex items-center gap-3 mb-1">
             <h1 className="text-3xl font-bold tracking-tight font-brand">{assessment.name}</h1>
             <Badge className={`uppercase text-[10px] tracking-widest font-bold border ${getStatusColor(assessment.status)}`}>
               {assessment.status?.replace('_', ' ')}
             </Badge>
           </div>
           <p className="text-muted-foreground flex items-center gap-2 text-sm">
             <Shield className="h-3.5 w-3.5" />
             {assessment.scf_version_id} • ID: <span className="font-mono text-[11px] opacity-70">{assessment.assessment_id.slice(0, 12)}...</span>
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="glass p-4 rounded-2xl border border-border/40">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Progress</span>
               <div className="flex items-end justify-between">
                 <span className="text-2xl font-bold">{assessment.progress || 0}%</span>
                 <Zap className="h-4 w-4 text-primary opacity-50 mb-1" />
               </div>
             </div>
             <div className="glass p-4 rounded-2xl border border-border/40">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Gap Versions</span>
               <div className="flex items-end justify-between">
                 <span className="text-2xl font-bold">
                   {gapCount === null ? <span className="text-sm text-muted-foreground animate-pulse">…</span> : gapCount}
                 </span>
                 <Shield className="h-4 w-4 text-emerald-500 opacity-50 mb-1" />
               </div>
             </div>
             <div className="glass p-4 rounded-2xl border border-border/40">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Evidence</span>
               <div className="flex items-end justify-between">
                 <span className="text-2xl font-bold">
                   {docCount === null ? <span className="text-sm text-muted-foreground animate-pulse">…</span> : docCount}
                 </span>
                 <FileText className="h-4 w-4 text-amber-500 opacity-50 mb-1" />
               </div>
             </div>
             <div className="glass p-4 rounded-2xl border border-border/40">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Actors</span>
               <div className="flex items-end justify-between">
                 <span className="text-2xl font-bold">{actorCount || events.length > 0 ? actorCount : "—"}</span>
                 <User className="h-4 w-4 text-purple-500 opacity-50 mb-1" />
               </div>
             </div>
          </div>

          <Card className="glass border-border/50 overflow-hidden rounded-3xl shadow-xl">
            <CardHeader className="bg-muted/30 pb-6 border-b border-border/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold font-brand">Execution Hub</CardTitle>
                  <CardDescription>Direct navigation to specialized compliance modules.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-border/10">
                 <Link 
                   to={`/gap-analysis?assessment=${assessment.assessment_id}`}
                   className="flex items-center justify-between p-6 hover:bg-primary/5 transition-all group"
                 >
                   <div className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                       <Search className="h-5 w-5" />
                     </div>
                     <div>
                       <h3 className="font-bold group-hover:text-primary transition-colors">Gap Analysis</h3>
                       <p className="text-sm text-muted-foreground">Identify missing controls and compliance debt.</p>
                     </div>
                   </div>
                   <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                 </Link>

                 <Link 
                   to={`/documents?assessment=${assessment.assessment_id}`}
                   className="flex items-center justify-between p-6 hover:bg-emerald-500/5 transition-all group"
                 >
                   <div className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                       <FileText className="h-5 w-5" />
                     </div>
                     <div>
                       <h3 className="font-bold group-hover:text-emerald-600 transition-colors">Evidence Repo</h3>
                       <p className="text-sm text-muted-foreground">Manage artifacts and supporting documentation.</p>
                     </div>
                   </div>
                   <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                 </Link>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
           <Card className="glass border-border/50 overflow-hidden rounded-3xl h-full shadow-xl">
            <CardHeader className="bg-muted/30 pb-6 border-b border-border/10">
               <div className="flex items-center gap-3">
                 <History className="h-5 w-5 text-primary" />
                 <CardTitle className="text-lg font-bold font-brand">Audit Trail</CardTitle>
               </div>
            </CardHeader>
            <CardContent className="p-6">
              {events.length === 0 ? (
                <div className="text-center py-12 opacity-40">
                  <Clock className="h-8 w-8 mx-auto mb-3" />
                  <p className="text-sm">No lifecycle events recorded.</p>
                </div>
              ) : (
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:to-transparent">
                  {events.map((ev, i) => (
                    <div key={i} className="relative pl-8 group">
                      <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-background border-2 border-primary group-hover:scale-110 transition-transform z-10 flex items-center justify-center shadow-lg shadow-primary/20">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">
                          {ev.event_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 pb-1">
                          <Clock className="h-3 w-3" />
                          {new Date(ev.timestamp).toLocaleString()}
                        </p>
                        {ev.reason && (
                          <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-xs text-muted-foreground italic">
                            {ev.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
