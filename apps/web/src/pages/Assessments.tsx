import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { CreateAssessmentModal } from "../components/CreateAssessmentModal";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { Skeleton } from "../components/ui/skeleton";
import { 
  Plus, 
  Filter, 
  ClipboardList, 
  MoreHorizontal, 
  ArrowRight,
  TrendingUp,
  Activity,
  ShieldCheck
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { useNavigate } from "react-router-dom";

// eslint-disable-next-line react-refresh/only-export-components
export interface Assessment {
  assessment_id: string;
  name: string;
  scf_version_id: string;
  status: "draft" | "in_review" | "completed";
  progress: number;
  last_updated: string;
}

export function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await api<{ data: Assessment[] }>("/api/v1/assessments");
      setAssessments(res?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "in_review": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <PageHeader
        title="Assessments"
        description="Unified compliance tracking and security control assessments across your organization."
      >
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="glass h-9">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm" className="h-9 shadow-lg shadow-primary/20" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Assessment
          </Button>
        </div>
      </PageHeader>

      {/* Summary Stats */}
      {!loading && assessments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-stagger">
          <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <ShieldCheck className="h-16 w-16" />
             </div>
             <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-primary/10 rounded-xl text-primary">
                 <ShieldCheck className="h-5 w-5" />
               </div>
               <span className="text-sm font-medium text-muted-foreground">Active Audits</span>
             </div>
             <div className="text-3xl font-bold tracking-tight">
               {assessments.filter(a => a.status !== 'completed').length}
             </div>
          </div>
          
          <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <TrendingUp className="h-16 w-16" />
             </div>
             <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                 <TrendingUp className="h-5 w-5" />
               </div>
               <span className="text-sm font-medium text-muted-foreground">Avg Progress</span>
             </div>
             <div className="text-3xl font-bold tracking-tight">
               {assessments.length > 0
                 ? `${Math.round(assessments.reduce((sum, a) => sum + (a.progress || 0), 0) / assessments.length)}%`
                 : '—'
               }
             </div>
          </div>

          <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Activity className="h-16 w-16" />
             </div>
             <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                 <Activity className="h-5 w-5" />
               </div>
               <span className="text-sm font-medium text-muted-foreground">In Review</span>
             </div>
             <div className="text-3xl font-bold tracking-tight">
               {assessments.filter(a => a.status === 'in_review').length}
             </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-3xl overflow-hidden border-border/50">
           <Skeleton className="h-[400px] w-full" />
        </div>
      ) : assessments.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No assessments yet"
          description="Start your compliance journey by creating your first security assessment."
          action={{
            label: "Start Your First Assessment",
            onClick: () => setShowModal(true),
          }}
        />
      ) : (
        <div className="glass rounded-3xl overflow-hidden border-border/50 shadow-2xl shadow-primary/5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/30">
                  <TableHead className="w-[300px] py-4 px-6 font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Framework</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Progress</TableHead>
                  <TableHead className="text-right py-4 px-6 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow 
                    key={assessment.assessment_id} 
                    className="group hover:bg-primary/5 border-border/10 cursor-pointer transition-all"
                    onClick={() => navigate(`/assessments/${assessment.assessment_id}`)}
                  >
                    <TableCell className="py-5 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-base group-hover:text-primary transition-colors">
                          {assessment.name}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          ID: {assessment.assessment_id.slice(0, 8)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted/50 border-border/50 font-medium">
                        {assessment.scf_version_id}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border uppercase text-[10px] tracking-wider px-2 py-0.5 ${getStatusColor(assessment.status)}`}>
                        {assessment.status?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 w-full max-w-[120px]">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${assessment.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {assessment.progress || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 text-right">
                      <div className="flex justify-end items-center gap-2">
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                           <MoreHorizontal className="h-4 w-4" />
                         </Button>
                         <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/0 group-hover:bg-primary/10 text-primary transition-all">
                           <ArrowRight className="h-4 w-4" />
                         </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {showModal && (
        <CreateAssessmentModal 
          onClose={() => setShowModal(false)} 
          onCreated={() => {
            setShowModal(false);
            fetchAssessments();
          }} 
        />
      )}
    </div>
  );
}
