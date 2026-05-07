import { Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground relative overflow-hidden">
      {/* Background Decorators for futuristic SaaS look */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-md p-4">
        <div className="mb-8 flex flex-col items-center justify-center space-y-2 text-center">
          <div className="h-10 w-10 bg-primary/20 flex items-center justify-center rounded-lg border border-primary/50 text-xl font-bold shadow-[0_0_15px_rgba(var(--primary),0.3)]">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Standard UI</h1>
          <p className="text-sm text-muted-foreground">Authenticate to access the platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
