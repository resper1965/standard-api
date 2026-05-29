import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { CreateAssessmentModal } from "../components/CreateAssessmentModal";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
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

 
export interface Assessment {
  assessment_id: string;
  name: string | Record<string, string>;
  scf_version_id: string | Record<string, string>;
  scf_version_label?: string;
  status: string;
  progress: number;
  last_updated: string;
}

/** Safely renders an i18n field ({pt, en}) or plain string as text */
function str(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, string>;
    return o.en ?? o.pt ?? Object.values(o)[0] ?? "";
  }
  return String(v);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >

      {/* Summary Stats */}
      <AnimatePresence>
        {!loading && assessments.length > 0 && (
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 bento-grid">
            <motion.div whileHover={{ y: -5 }} className="glass-premium p-6 rounded-3xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 group-hover:-rotate-12 duration-500">
                 <ShieldCheck className="h-24 w-24" />
               </div>
               <div className="flex items-center gap-3 mb-4 relative z-10">
                 <div className="p-2.5 bg-primary/20 dark:bg-primary/10 rounded-xl text-primary border border-primary/20 backdrop-blur-sm">
                   <ShieldCheck className="h-5 w-5" />
                 </div>
                 <span className="text-sm font-medium text-muted-foreground">Active Audits</span>
               </div>
               <div className="text-4xl font-brand font-bold tracking-tight relative z-10">
                 {assessments.filter(a => a.status !== 'completed').length}
               </div>
            </motion.div>
            
            <motion.div whileHover={{ y: -5 }} className="glass-premium p-6 rounded-3xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 group-hover:-rotate-12 duration-500 text-emerald-500">
                 <TrendingUp className="h-24 w-24" />
               </div>
               <div className="flex items-center gap-3 mb-4 relative z-10">
                 <div className="p-2.5 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20 backdrop-blur-sm">
                   <TrendingUp className="h-5 w-5" />
                 </div>
                 <span className="text-sm font-medium text-muted-foreground">Avg Progress</span>
               </div>
               <div className="text-4xl font-brand font-bold tracking-tight relative z-10">
                 {assessments.length > 0
                   ? `${Math.round(assessments.reduce((sum, a) => sum + (a.progress || 0), 0) / assessments.length)}%`
                   : '—'
                 }
               </div>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="glass-premium p-6 rounded-3xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 group-hover:-rotate-12 duration-500 text-warning">
                 <Activity className="h-24 w-24" />
               </div>
               <div className="flex items-center gap-3 mb-4 relative z-10">
                 <div className="p-2.5 bg-amber-500/20 dark:bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20 backdrop-blur-sm">
                   <Activity className="h-5 w-5" />
                 </div>
                 <span className="text-sm font-medium text-muted-foreground">In Review</span>
               </div>
               <div className="text-4xl font-brand font-bold tracking-tight relative z-10">
                 {assessments.filter(a => a.status === 'in_review').length}
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="glass-panel rounded-3xl overflow-hidden">
             <Skeleton className="h-[400px] w-full opacity-50" />
          </div>
        ) : assessments.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title="No assessments yet"
              description="Start your compliance journey by creating your first security assessment."
              action={{
                label: "Start Your First Assessment",
                onClick: () => setShowModal(true),
              }}
            />
          </motion.div>
        ) : (
          <div className="glass-premium rounded-3xl overflow-hidden border-border/20">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-black/5 dark:bg-white/5 border-b border-white/5">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[300px] py-4 px-6 font-semibold uppercase tracking-wider text-xs">Name</TableHead>
                    <TableHead className="font-semibold uppercase tracking-wider text-xs">Framework</TableHead>
                    <TableHead className="font-semibold uppercase tracking-wider text-xs">Status</TableHead>
                    <TableHead className="font-semibold uppercase tracking-wider text-xs">Progress</TableHead>
                    <TableHead className="text-right py-4 px-6 font-semibold uppercase tracking-wider text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {assessments.map((assessment, i) => (
                      <motion.tr 
                        key={assessment.assessment_id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group hover:bg-white/5 dark:hover:bg-white/5 border-b border-white/5 cursor-pointer transition-colors"
                        onClick={() => navigate(`/assessments/${assessment.assessment_id}`)}
                      >
                        <TableCell className="py-5 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-base group-hover:text-primary transition-colors">
                              {str(assessment.name)}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              ID: {assessment.assessment_id.slice(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-muted/50 border-border/50 font-medium">
                            {str(assessment.scf_version_label || assessment.scf_version_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border uppercase text-[10px] tracking-wider px-2 py-0.5 ${getStatusColor(assessment.status)}`}>
                            {str(assessment.status)?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 w-full max-w-[120px]">
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${assessment.progress || 0}%` }}
                                transition={{ duration: 1, delay: 0.5 + (i * 0.1), ease: "easeOut" }}
                                className="h-full bg-primary" 
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {assessment.progress || 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-5 px-6 text-right">
                          <div className="flex justify-end items-center gap-2">
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10">
                               <MoreHorizontal className="h-4 w-4" />
                             </Button>
                             <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/0 group-hover:bg-primary/20 text-primary transition-all">
                               <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                             </div>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <CreateAssessmentModal 
            onClose={() => setShowModal(false)} 
            onCreated={() => {
              setShowModal(false);
              fetchAssessments();
            }} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
