import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../lib/api";
import { useSession } from "../../lib/auth-client";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardContent } from "../../components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Loader2, Plus, Copy, Check, AlertTriangle } from "lucide-react";

type LicenseKey = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  expiresAt?: Date;
  status: "active" | "revoked" | "expired";
};

export function AdminLicenses() {
  const { data: session } = useSession();
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getOrgId = () =>
    (session?.session as Record<string, unknown>)?.activeOrganizationId as
      | string
      | undefined;

  const fetchLicenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const orgId = getOrgId();
      if (!orgId) {
        // Fallback: tentar endpoint admin de listagem
        const res = await api<{ data: LicenseKey[] }>(
          "/api/auth/admin/list-licenses",
          { method: "GET" }
        );
        const dataArray = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : [];
        setLicenses(dataArray);
        return;
      }
      const res = await api<{ data: LicenseKey[] }>(
        `/api/v1/organizations/${orgId}/api-keys`,
        { method: "GET" }
      );
      setLicenses(res?.data ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to fetch API keys";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setGenerating(true);
    setGeneratedKey(null);
    setError(null);

    try {
      const orgId = getOrgId();
      if (!orgId) throw new Error("No active organization in session.");

      const res = await api<{ data: { id: string; name: string; key: string; createdAt: string } }>(
        `/api/v1/organizations/${orgId}/api-keys`,
        {
          method: "POST",
          body: JSON.stringify({ name: newKeyName.trim() }),
        }
      );

      setGeneratedKey(res.data.key);
      setNewKeyName("");
      await fetchLicenses();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate API key";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="API Keys" description="Generate and manage API access keys">
        <Button
          size="sm"
          onClick={() => {
            setShowModal(true);
            setGeneratedKey(null);
            setCopied(false);
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Generate Key
        </Button>
      </PageHeader>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border-border/60 shadow-none">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground text-sm"
                    >
                      No API keys yet. Generate one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  licenses.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">
                          {l.keyPrefix ?? "sk_***"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            l.status === "active"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {l.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <Card
            className="w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold">Generate API Key</h3>

              {generatedKey ? (
                <div className="space-y-4">
                  <Alert className="border-amber-500 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertTitle className="text-amber-500">
                      Copy now — won't be shown again
                    </AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 flex gap-2">
                        <Input
                          readOnly
                          value={generatedKey}
                          className="font-mono text-xs flex-1"
                        />
                        <Button variant="outline" size="icon" onClick={copyKey}>
                          {copied ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => setShowModal(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Key Name</Label>
                    <Input
                      required
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Production API Key"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={generating}>
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
