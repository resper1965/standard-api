import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface AssessmentSummary {
  id: string;
  name: string;
  status: string;
  framework?: string;
}

/**
 * Hook that reads ?assessment= from the URL query string.
 * When assessmentId is absent, fetches the list of assessments
 * so a selector can be displayed to the user.
 */
export function useActiveAssessment() {
  const [searchParams, setSearchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");

  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (assessmentId) return; // Already have an assessment — no need to fetch list
    setLoadingList(true);
    api<{ data: AssessmentSummary[] }>("/api/v1/assessments?limit=50")
      .then((res) => setAssessments(res.data ?? []))
      .catch(() => setAssessments([]))
      .finally(() => setLoadingList(false));
  }, [assessmentId]);

  const selectAssessment = (id: string) => {
    setSearchParams({ assessment: id });
  };

  return { assessmentId, assessments, loadingList, selectAssessment };
}
