import { Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground relative overflow-hidden">
      {/* Subtle gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-[420px] px-6">
        <div className="mb-10 flex flex-col items-center text-center">
          <h1 className="text-2xl font-brand mt-4">
            standard<span className="text-primary">.</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Authenticate to access the platform
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
