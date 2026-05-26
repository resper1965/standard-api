import { useActiveAssessment } from "@/hooks/use-active-assessment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileSearch } from "lucide-react";

interface Props {
  /** Label for the section needing an assessment (e.g. "Gap Analysis", "Reports") */
  label?: string;
}

/**
 * Shown when a page requires an assessment context (?assessment= in URL)
 * but none is present. Lets the user pick from their existing assessments.
 */
export function AssessmentSelector({ label = "this section" }: Props) {
  const { assessments, loadingList, selectAssessment } = useActiveAssessment();

  if (loadingList) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground p-16">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading assessments…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-16 text-center">
      <div className="rounded-full bg-muted/40 p-5">
        <FileSearch className="h-12 w-12 text-muted-foreground/60" />
      </div>

      <div className="space-y-1.5">
        <p className="font-semibold text-lg">Select an assessment</p>
        <p className="text-muted-foreground text-sm max-w-xs">
          To access {label}, choose an assessment below or navigate from the
          Assessments page.
        </p>
      </div>

      {assessments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No assessments found.{" "}
          <a
            href="/dashboard/assessments"
            className="underline text-primary hover:text-primary/80"
          >
            Create one
          </a>{" "}
          to get started.
        </p>
      ) : (
        <Select onValueChange={selectAssessment}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Choose an assessment…" />
          </SelectTrigger>
          <SelectContent>
            {assessments.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="font-medium">{a.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({a.status})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
