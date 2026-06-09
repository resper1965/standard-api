export type User = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  /** True if this user is a platform administrator — cannot be deleted without removing flag first */
  platformAdmin?: boolean;
  createdAt: string;
  updatedAt?: string;
  banned?: boolean;
  banReason?: string | null;
  approved?: boolean;
  image?: string;
};

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

export function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

export function passwordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(score, 4);
  const labels: Record<number, { label: string; color: string }> = {
    0: { label: "Too weak", color: "bg-destructive" },
    1: { label: "Weak", color: "bg-destructive" },
    2: { label: "Fair", color: "bg-amber-500" },
    3: { label: "Good", color: "bg-emerald-500" },
    4: { label: "Strong", color: "bg-emerald-500" },
  };
  return { score, ...labels[score] };
}
