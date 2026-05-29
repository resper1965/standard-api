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
    <div className="flex flex-col items-center justify-center gap-6 p-16 text-center bento-card glass-premium max-w-2xl mx-auto my-8 animate-slide-up">
      <div className="rounded-full bg-primary/10 p-5 ring-1 ring-primary/20 shadow-[0_0_20px_rgba(14,165,233,0.15)]">
        <FileSearch className="h-12 w-12 text-primary" />
      </div>

      <div className="space-y-1.5">
        <p className="font-brand font-bold text-2xl text-foreground tracking-tight">Select an assessment</p>
        <p className="text-muted-foreground text-[15px] max-w-md mx-auto leading-relaxed">
          To access {label}, choose an assessment below or navigate from the
          Assessments page.
        </p>
      </div>

      {assessments.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-black/20 px-4 py-2 rounded-lg border border-white/5">
          No assessments found.{" "}
          <a
            href="/dashboard/assessments"
            className="underline text-primary hover:text-primary/80 font-medium"
          >
            Create one
          </a>{" "}
          to get started.
        </p>
      ) : (
        <div className="w-full max-w-sm">
          <Select onValueChange={selectAssessment}>
            <SelectTrigger className="w-full h-12 bg-black/20 border-white/10 hover:border-primary/50 transition-colors">
              <SelectValue placeholder="Choose an assessment…" />
            </SelectTrigger>
            <SelectContent>
              {assessments.map((a) => (
                <SelectItem key={a.id} value={a.id} className="cursor-pointer">
                  <span className="font-medium text-foreground">{a.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground bg-black/20 px-2 py-0.5 rounded-full">
                    {a.status}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
