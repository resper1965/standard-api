import { Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground relative overflow-hidden">
      {/* Background Decorators for futuristic SaaS look */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-md p-4">
        <div className="mb-8 flex flex-col items-center justify-center space-y-2 text-center">
          <h1 className="text-3xl font-brand font-medium tracking-tight mt-4">
            standard<span className="text-[#00ADE8]">.</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Authenticate to access the platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
