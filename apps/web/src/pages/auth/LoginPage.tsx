import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { signIn, signUp } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Mail, Lock, User } from "lucide-react"

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleGoogle = () => {
    signIn.social({
      provider: "google",
      callbackURL: import.meta.env.PROD
        ? "https://standard.bekaa.eu/dashboard"
        : "/dashboard",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "login") {
        const result = await signIn.email({ email, password })
        if (result.error) {
          setError(result.error.message || "Login failed")
        } else {
          navigate("/dashboard")
        }
      } else {
        const result = await signUp.email({ email, password, name })
        if (result.error) {
          setError(result.error.message || "Sign up failed")
        } else {
          navigate("/dashboard")
        }
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6 animate-slide-up">
      {/* Google OAuth */}
      <button
        className="w-full inline-flex items-center justify-center gap-3 rounded-lg border border-border/60 bg-card/80 px-4 h-11 text-sm font-medium text-foreground hover:bg-muted/60 transition-all"
        onClick={handleGoogle}
        type="button"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border/60" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="auth-name">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="auth-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="auth-email">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="auth-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="auth-password">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
              required
              minLength={8}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive animate-slide-up">
            {error}
          </div>
        )}

        <Button className="w-full h-11" type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {mode === "login" ? "Sign In" : "Create Account"}
        </Button>
      </form>

      {/* Toggle */}
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <button className="text-primary font-medium hover:underline" onClick={() => setMode("signup")} type="button">
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button className="text-primary font-medium hover:underline" onClick={() => setMode("login")} type="button">
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  )
}
