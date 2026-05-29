import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp, useSession } from "../lib/auth-client";
import { Navigate } from "react-router-dom";
import "./Login.css";

// ── Icons (inline SVG for zero-dependency) ──────────────────────
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="login-icon">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="login-icon">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="login-icon">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconEye({ off }: { off?: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconAlertCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-error-icon">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────
export function LoginPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isPending) return null;
  if (session?.user) return <Navigate to="/dashboard" replace />;

  const handleGoogle = () => {
    signIn.social({
      provider: "google",
      callbackURL: import.meta.env.PROD
        ? "https://standard.bekaa.eu/dashboard"
        : "/dashboard",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const result = await signIn.email({ email, password });
        if (result.error) {
          setError(result.error.message || "Invalid email or password");
        } else {
          navigate("/dashboard");
        }
      } else {
        const result = await signUp.email({ email, password, name });
        if (result.error) {
          setError(result.error.message || "Sign up failed");
        } else {
          navigate("/dashboard");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "signup") => {
    setError("");
    setMode(m);
  };

  return (
    <div className="login-root">
      
      {/* ── Left Panel (Branding / Hero) ── */}
      <div className="login-left">
        <div className="login-left-bg-pattern"></div>
        <div className="login-left-glow"></div>
        
        <div className="login-left-content">
          <div className="login-logo-large">
            <div className="login-logo-icon">
              <IconShield />
            </div>
            <span>Standard GRC</span>
          </div>
          
          <h1 className="login-headline">
            Automate Compliance with <span className="text-gradient">Agentic AI.</span>
          </h1>
          <p className="login-subheadline">
            The unified platform for SOC 2, ISO 27001, HIPAA, and 231+ frameworks. Let AI handle the heavy lifting of evidence mapping and gap analysis.
          </p>

          <div className="login-stats">
            <div className="stat-box">
              <span className="stat-number">15k+</span>
              <span className="stat-label">Crosswalks</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">231</span>
              <span className="stat-label">Frameworks</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">10x</span>
              <span className="stat-label">Faster Audits</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel (Auth Form) ── */}
      <div className="login-right">
        <div className="login-right-inner">
          
          <div className="login-right-header">
            <h2 className="login-title">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </h2>
            <p className="login-subtitle">
              {mode === "login"
                ? "Sign in to access your security workspace."
                : "Join the future of automated compliance."}
            </p>
          </div>

          <div className="login-card">
            <button
              className="login-btn-google"
              onClick={handleGoogle}
              type="button"
            >
              <GoogleLogo />
              <span>Continue with Google</span>
            </button>

            <div className="login-divider">
              <span className="login-divider-line" />
              <span className="login-divider-text">or continue with email</span>
              <span className="login-divider-line" />
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <div className="login-field">
                  <label className="login-label" htmlFor="name">Full Name</label>
                  <div className="login-input-group">
                    <div className="login-input-icon-wrap"><IconUser /></div>
                    <input
                      id="name"
                      className="login-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div className="login-field">
                <label className="login-label" htmlFor="email">Email Address</label>
                <div className="login-input-group">
                  <div className="login-input-icon-wrap"><IconMail /></div>
                  <input
                    id="email"
                    className="login-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="login-label-row">
                  <label className="login-label" htmlFor="password">Password</label>
                  {mode === "login" && (
                    <a href="#" className="login-forgot-link">Forgot password?</a>
                  )}
                </div>
                <div className="login-input-group">
                  <div className="login-input-icon-wrap"><IconLock /></div>
                  <input
                    id="password"
                    className="login-input"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="login-pw-toggle"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    <IconEye off={showPw} />
                  </button>
                </div>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <IconAlertCircle />
                  <span>{error}</span>
                </div>
              )}

              <button
                className="login-btn-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="login-spinner" />
                ) : mode === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          </div>

          <div className="login-footer">
            <p>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button className="login-toggle-btn" onClick={() => switchMode(mode === "login" ? "signup" : "login")} type="button">
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
          
        </div>
      </div>

    </div>
  );
}
