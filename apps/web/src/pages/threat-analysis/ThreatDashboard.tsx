import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, Plus, Server, HardDrive, Share2, UserSquare2, ShieldAlert,
  Activity, AlertTriangle, BadgeAlert
} from "lucide-react";

type ThreatElement = "Actor" | "Process" | "Data Store" | "Data Flow";
type StrideCategory = "S" | "T" | "R" | "I" | "D" | "E";

interface ThreatModelRecord {
  id: string;
  versionId: string;
  element: ThreatElement;
  componentName: string;
  strideCategory: StrideCategory;
  description: string;
  fmea: { severity: number; occurrence: number; detection: number; };
  rpn: number;
  mitigation: string;
  status: "Open" | "Mitigated" | "Accepted";
}

const ELEMENT_ICONS = {
  "Actor": UserSquare2,
  "Process": Server,
  "Data Store": HardDrive,
  "Data Flow": Share2
};

const STRIDE_LABELS = {
  "S": "Spoofing", "T": "Tampering", "R": "Repudiation", 
  "I": "Information Disclosure", "D": "Denial of Service", "E": "Elevation of Privilege"
};

export function ThreatDashboard() {
  const { id } = useParams<{ id: string }>();
  const [threats, setThreats] = useState<ThreatModelRecord[]>([]);
  const [versionData, setVersionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form state
  const [element, setElement] = useState<ThreatElement>("Process");
  const [componentName, setComponentName] = useState("");
  const [strideCategory, setStrideCategory] = useState<StrideCategory>("S");
  const [description, setDescription] = useState("");
  const [fmea, setFmea] = useState({ severity: 5, occurrence: 5, detection: 5 });
  const [mitigation, setMitigation] = useState("");
  const [status, setStatus] = useState<"Open"|"Mitigated"|"Accepted">("Open");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [vRes, tRes] = await Promise.all([
        fetch(`/api/v1/threat-analysis/versions/${id}`),
        fetch(`/api/v1/threat-analysis/versions/${id}/threats`)
      ]);
      if (vRes.ok) setVersionData(await vRes.json());
      if (tRes.ok) setThreats(await tRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/threat-analysis/versions/${id}/threats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          element, componentName, strideCategory, description, fmea, mitigation, status
        })
      });
      if (res.ok) {
        setIsFormOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getRpnColor = (rpn: number) => {
    if (rpn > 300) return "bg-red-500/15 text-red-700 border-red-500/30";
    if (rpn > 100) return "bg-orange-500/15 text-orange-700 border-orange-500/30";
    if (rpn > 50) return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
    return "bg-green-500/15 text-green-700 border-green-500/30";
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!versionData) return <div className="p-10 text-center text-red-500">Version not found</div>;

  return (
    <div className="flex-1 overflow-auto bg-background/95">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link to="/threat-analysis" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Versions
            </Link>
            <h1 className="text-3xl font-brand font-bold tracking-tight">
              Threat Model: nCommand Lite {versionData.versionString}
            </h1>
          </div>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Threat
          </button>
        </header>

        {isFormOpen && (
          <div className="bg-card border rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold font-brand mb-4 border-b pb-2">New Threat</h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                
                {/* Element Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Element Type</label>
                  <select value={element} onChange={e => setElement(e.target.value as ThreatElement)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {Object.keys(ELEMENT_ICONS).map(el => (
                      <option key={el} value={el}>{el}</option>
                    ))}
                  </select>
                </div>

                {/* Component Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Component Name</label>
                  <input required value={componentName} onChange={e => setComponentName(e.target.value)} placeholder="e.g. Postgres DB, API Gateway..." className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>

                {/* STRIDE Category */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">STRIDE Category</label>
                  <select value={strideCategory} onChange={e => setStrideCategory(e.target.value as StrideCategory)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {Object.entries(STRIDE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v} ({k})</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="Open">Open</option>
                    <option value="Mitigated">Mitigated</option>
                    <option value="Accepted">Accepted</option>
                  </select>
                </div>
              </div>

              {/* Description & Mitigation */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Threat Description</label>
                  <textarea required value={description} onChange={e => setDescription(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mitigation</label>
                  <textarea value={mitigation} onChange={e => setMitigation(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              </div>

              {/* FMEA */}
              <div className="bg-muted/30 border rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> FMEA Scoring
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-medium flex justify-between">
                      Severity (S) <span className="font-bold text-primary">{fmea.severity}</span>
                    </label>
                    <input type="range" min="1" max="10" value={fmea.severity} onChange={e => setFmea({...fmea, severity: parseInt(e.target.value)})} className="w-full mt-2 accent-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium flex justify-between">
                      Occurrence (O) <span className="font-bold text-primary">{fmea.occurrence}</span>
                    </label>
                    <input type="range" min="1" max="10" value={fmea.occurrence} onChange={e => setFmea({...fmea, occurrence: parseInt(e.target.value)})} className="w-full mt-2 accent-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium flex justify-between">
                      Detection (D) <span className="font-bold text-primary">{fmea.detection}</span>
                    </label>
                    <input type="range" min="1" max="10" value={fmea.detection} onChange={e => setFmea({...fmea, detection: parseInt(e.target.value)})} className="w-full mt-2 accent-primary" />
                  </div>
                </div>
                <div className="pt-2 border-t mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium">Calculated RPN (S × O × D)</span>
                  <span className={`px-3 py-1 rounded border font-bold text-sm ${getRpnColor(fmea.severity * fmea.occurrence * fmea.detection)}`}>
                    {fmea.severity * fmea.occurrence * fmea.detection}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted/50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">Save Threat</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {threats.length === 0 ? (
            <div className="text-center border rounded-xl border-dashed py-12">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">No threats mapped yet</h3>
              <p className="text-muted-foreground text-sm">Add a new threat to start building your Threat Dragon model.</p>
            </div>
          ) : (
            threats.map(t => {
              const Icon = ELEMENT_ICONS[t.element];
              return (
                <div key={t.id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-4 border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-none mb-1">{t.componentName}</h3>
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{t.element}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${t.status === 'Mitigated' ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-orange-500/10 text-orange-700 border-orange-500/20'}`}>
                        {t.status}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getRpnColor(t.rpn)}`}>
                        RPN: {t.rpn}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="font-semibold text-sm">Threat ({STRIDE_LABELS[t.strideCategory]})</span>
                      </div>
                      <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg min-h-[80px]">
                        {t.description}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <BadgeAlert className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-sm">Mitigation</span>
                      </div>
                      <p className="text-sm text-muted-foreground bg-green-500/5 border border-green-500/10 p-3 rounded-lg min-h-[80px]">
                        {t.mitigation || "No mitigation defined."}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <button 
                      onClick={() => fetch(`/api/v1/threat-analysis/threats/${t.id}`, { method: 'DELETE' }).then(fetchData)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
      </div>
    </div>
  );
}
