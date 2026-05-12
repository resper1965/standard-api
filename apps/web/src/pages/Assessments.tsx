import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { AssessmentCard } from "../components/AssessmentCard";
import type { Assessment } from "../components/AssessmentCard";
import { CreateAssessmentModal } from "../components/CreateAssessmentModal";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/button";
import { Plus, Loader2 } from "lucide-react";

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
      <PageHeader
        title="Assessments"
        description="Manage your security and compliance assessments"
      >
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Assessment
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border/60 rounded-lg">
          <p className="text-muted-foreground mb-4">No assessments found.</p>
          <Button variant="outline" onClick={() => setShowModal(true)}>
            Start Your First Assessment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
