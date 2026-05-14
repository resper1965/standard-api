import { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { authClient } from "../lib/auth-client";

interface AnalyticsDashboardProps {
  organizationId: string;
}

export function AnalyticsDashboard({ organizationId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation this would fetch from /api/v1/organizations/:orgId/metrics/m2m
    // For now we mock the data to illustrate the Agent vs User HTTP requests.
    setTimeout(() => {
      setData([
        { date: "May 01", M2M: 120, Web: 400 },
        { date: "May 02", M2M: 200, Web: 420 },
        { date: "May 03", M2M: 650, Web: 390 }, // Spike in autonomous agent queries
        { date: "May 04", M2M: 800, Web: 450 },
        { date: "May 05", M2M: 520, Web: 300 },
        { date: "May 06", M2M: 700, Web: 280 },
      ]);
      setLoading(false);
    }, 1000);
  }, [organizationId]);

  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: "0 0 8px 0" }}>API Request Analytics</h2>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.875rem" }}>
            Monitor inbound traffic separated by Human (Web UI) and Autonomous Agents (M2M Keys).
          </p>
        </div>
        <div style={{ display: "flex", gap: "16px", fontSize: "0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#6366f1" }}></div>
            <span>M2M Agents</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981" }}></div>
            <span>Web UI</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          Loading telemetry...
        </div>
      ) : (
        <div style={{ height: "300px", width: "100%" }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorM2M" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px" }}
                itemStyle={{ color: "white", fontSize: "0.875rem" }}
              />
              <Area type="monotone" dataKey="Web" stroke="#10b981" fillOpacity={1} fill="url(#colorWeb)" />
              <Area type="monotone" dataKey="M2M" stroke="#6366f1" fillOpacity={1} fill="url(#colorM2M)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
