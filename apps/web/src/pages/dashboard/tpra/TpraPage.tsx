import { useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useTpraVendors,
  useCreateTpraVendor,
  useTpraVendorAssessments,
  useTpraVendorRiskScores,
  type TpraVendor,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Plus, Building, FileText, ShieldAlert, ChevronRight, ArrowLeft } from "lucide-react";

// ── Vendor detail sub-view ───────────────────────────────────────────
function VendorDetail({
  vendor,
  onBack,
}: {
  vendor: TpraVendor;
  onBack: () => void;
}) {
  const { data: assessmentsData, isLoading: assessmentsLoading } = useTpraVendorAssessments(vendor.vendor_id);
  const { data: scoresData, isLoading: scoresLoading } = useTpraVendorRiskScores(vendor.vendor_id);

  const assessments = assessmentsData?.data ?? [];
  const scores = scoresData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-8 w-8 rounded-lg flex items-center justify-center border border-border/50 hover:bg-muted/40 transition-colors"
          aria-label="Back to vendors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-lg font-semibold">{vendor.name}</h2>
          {vendor.domain && <p className="text-xs text-muted-foreground">{vendor.domain}</p>}
        </div>
        <span className="ds-badge ds-badge--muted capitalize ml-auto">{vendor.status}</span>
      </div>

      {/* Assessments section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assessments</h3>
        {assessmentsLoading ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : assessments.length === 0 ? (
          <div className="py-8 flex flex-col items-center border border-dashed rounded-lg bg-muted/20">
            <FileText className="h-6 w-6 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No assessments for this vendor.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assessments.map((a) => (
              <div key={a.assessment_id} className="p-4 rounded-xl border bg-card flex justify-between items-center">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1">{a.assessment_id}</p>
                  <p className="text-xs text-muted-foreground">Created: {new Date(a.created_at).toLocaleDateString()}</p>
                </div>
                <span className="ds-badge ds-badge--active capitalize">{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk Scores section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk Scores</h3>
        {scoresLoading ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : scores.length === 0 ? (
          <div className="py-8 flex flex-col items-center border border-dashed rounded-lg bg-muted/20">
            <ShieldAlert className="h-6 w-6 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No risk scores calculated yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scores.map((s) => (
              <div key={s.score_id} className="p-4 rounded-xl border bg-card">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-xs text-muted-foreground">{new Date(s.calculated_at).toLocaleDateString()}</p>
                  <span className={`ds-badge ${s.risk_tier === 'high' || s.risk_tier === 'critical' ? 'ds-badge--destructive' : 'ds-badge--active'} capitalize`}>
                    {s.risk_tier}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{s.calculated_score}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main TPRA Page ───────────────────────────────────────────────────
export function TpraPage() {
  useDocumentTitle("Third-Party Risk (TPRA)");

  const { data: vendorsData, isLoading: vendorsLoading } = useTpraVendors();

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorDomain, setNewVendorDomain] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<TpraVendor | null>(null);

  const createVendor = useCreateTpraVendor();

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;

    try {
      await createVendor.mutateAsync({ name: newVendorName, domain: newVendorDomain || undefined });
      setIsVendorModalOpen(false);
      setNewVendorName("");
      setNewVendorDomain("");
    } catch (err) {
      console.error(err);
    }
  };

  const vendors = vendorsData?.data ?? [];

  // If a vendor is selected, show its detail view
  if (selectedVendor) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Third-Party Risk (TPRA)"
          description="Manage vendors, track risk assessments, and view compliance scores."
        />
        <VendorDetail vendor={selectedVendor} onBack={() => setSelectedVendor(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Third-Party Risk (TPRA)"
          description="Manage vendors, track risk assessments, and view compliance scores."
        />
        <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
              <DialogDescription>Register a third-party vendor for risk assessment.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateVendor} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Vendor Name</label>
                <Input
                  placeholder="e.g. Acme Corp"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  disabled={createVendor.isPending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Domain (optional)</label>
                <Input
                  placeholder="e.g. acme.com"
                  value={newVendorDomain}
                  onChange={(e) => setNewVendorDomain(e.target.value)}
                  disabled={createVendor.isPending}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={!newVendorName.trim() || createVendor.isPending}>
                  {createVendor.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Vendor
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vendors Grid */}
      {vendorsLoading ? (
        <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : vendors.length === 0 ? (
        <div className="py-12 flex flex-col items-center border border-dashed rounded-lg bg-muted/20">
          <Building className="h-8 w-8 text-muted-foreground mb-4" />
          <p className="text-sm font-medium text-foreground mb-1">No vendors registered yet</p>
          <p className="text-xs text-muted-foreground">Click "Add Vendor" to register your first third-party.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <button
              key={v.vendor_id}
              onClick={() => setSelectedVendor(v)}
              className="p-4 rounded-xl border bg-card hover:border-primary/30 transition-colors text-left group"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{v.name}</h3>
                  {v.domain && <p className="text-xs text-muted-foreground mt-1">{v.domain}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="ds-badge ds-badge--muted capitalize">{v.status}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
