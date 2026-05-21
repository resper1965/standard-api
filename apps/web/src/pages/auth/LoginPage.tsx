import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { signIn, signUp, useSession } from "@/lib/auth-client"
import { Navigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react"

export function LoginPage() {
  const { data: session, isPending } = useSession()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  if (isPending) {
    return (
      <div className="fullpage-center">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (session?.user) return <Navigate to="/dashboard" replace />

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
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || err?.statusText || "An unexpected error occurred"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fullpage-center">
      <div className="login-container animate-slide-up">
        {/* Brand header */}
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-text font-brand">
              standard<span className="text-primary brand-dot">.</span>
            </span>
          </div>
          <p className="login-subtitle">
            Agentic Compliance & Security Platform
          </p>
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
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
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
        <p className="text-center text-sm text-muted-foreground mt-4">
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
    </div>
  )
}
