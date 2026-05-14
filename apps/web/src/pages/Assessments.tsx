import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { AssessmentCard } from "../components/AssessmentCard";
import type { Assessment } from "../components/AssessmentCard";
import { CreateAssessmentModal } from "../components/CreateAssessmentModal";
import { Button } from "../components/ui/button";
import { Plus, Loader2, Filter } from "lucide-react";

export function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {assessments.length} assessment{assessments.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filter
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Assessment
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border/60 rounded-xl">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-base font-medium text-foreground mb-1">No assessments yet</h3>
          <p className="text-muted-foreground mb-6 text-sm">Start your compliance journey</p>
          <Button onClick={() => setShowModal(true)}>
            Start Your First Assessment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {assessments.map(assessment => (
            <AssessmentCard key={assessment.assessment_id} assessment={assessment} />
          ))}
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
