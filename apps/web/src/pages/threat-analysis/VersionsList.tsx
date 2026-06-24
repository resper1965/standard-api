import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Plus, Calendar, Activity } from "lucide-react";
import { useSession } from "../../lib/auth-client";

type ApplicationVersionRecord = {
  id: string;
  versionString: string;
  releaseDate: string;
  status: "Draft" | "Published" | "Archived";
};

export function VersionsList() {
  const { data: session } = useSession();
  const [versions, setVersions] = useState<ApplicationVersionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      // Mocking fetch to the actual API, using the same pattern as other pages
      const res = await fetch("/api/v1/threat-analysis/versions");
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (err) {
      console.error("Failed to fetch versions", err);
    } finally {
      setLoading(false);
    }
  };

  const createVersion = async () => {
    const versionString = prompt("Enter new version (e.g. v2.0):");
    if (!versionString) return;
    try {
      const res = await fetch("/api/v1/threat-analysis/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionString,
          releaseDate: new Date().toISOString().split("T")[0],
          status: "Draft"
        })
      });
      if (res.ok) {
        fetchVersions();
      }
    } catch (err) {
      console.error("Failed to create version", err);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background/95">
      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-brand font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-8 w-8 text-primary" />
              Threat Analysis
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Manage threat models for nCommand Lite versions using STRIDE and FMEA methodologies.
            </p>
          </div>
          <button 
            onClick={createVersion}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Version
          </button>
        </header>

        <div className="grid gap-6">
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-center border rounded-xl border-dashed py-12">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">No versions found</h3>
              <p className="text-muted-foreground text-sm">Create a new version to start modeling threats.</p>
            </div>
          ) : (
            versions.map(v => (
              <div key={v.id} className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-bold font-brand">nCommand Lite {v.versionString}</h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {v.releaseDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        Status: <span className="font-semibold text-foreground">{v.status}</span>
                      </span>
                    </div>
                  </div>
                  <Link 
                    to={`/threat-analysis/versions/${v.id}`}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                  >
                    View Threats
                  </Link>
                </div>
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary group-hover:w-1.5 transition-all"></div>
              </div>
            ))
          )}
        </div>
        
      </div>
    </div>
  );
}
