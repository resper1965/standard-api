import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  Lock, 
  Zap, 
  ChevronRight, 
  CheckCircle2, 
  Globe, 
  ArrowRight,
  Github
} from "lucide-react";
import "./Landing.css";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-root dark">
      {/* Background Effects */}
      <div className="fixed inset-0 dot-grid opacity-20 pointer-events-none" />
      <div className="fixed top-0 -left-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 -right-1/4 w-1/2 h-1/2 bg-info/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5 py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-brand text-2xl tracking-tighter">
              <span className="brand-logo">standard<span className="brand-logo-dot">.</span></span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#compliance" className="hover:text-foreground transition-colors">Compliance</a>
            <a href="#automation" className="hover:text-foreground transition-colors">Automation</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-sm font-medium hover:text-primary transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate("/login")}
              className="btn btn-primary h-10 px-5 rounded-full"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 overflow-hidden">
          <div className="container mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-8 animate-slide-up">
              <Zap className="w-3 h-3" />
              <span>v1.0 is now live</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
              Compliance at the <br />
              <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                speed of thought.
              </span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 animate-slide-up" style={{ animationDelay: '200ms' }}>
              Standardize your security operations. Auto-generate compliance evidence, 
              track SCF controls, and bridge the gap with AI-driven gap analysis.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <button 
                onClick={() => navigate("/login")}
                className="btn btn-primary h-12 px-8 rounded-full text-base group"
              >
                Start for Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="btn btn-google h-12 px-8 rounded-full text-base border-white/5 bg-white/5 hover:bg-white/10">
                <Github className="w-4 h-4" />
                View on GitHub
              </button>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to ship safely</h2>
              <p className="text-muted-foreground">The ultimate toolkit for modern security teams.</p>
            </div>

            <div className="bento-grid">
              <div className="bento-card col-span-1 md:col-span-2 group">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
                    <Shield className="text-primary w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 font-brand">SCF Native Framework</h3>
                  <p className="text-muted-foreground text-lg mb-6 max-w-md">
                    Built from the ground up for the Secure Controls Framework. 
                    Manage over 1,000 mapping points across ISO, NIST, and SOC2 effortlessly.
                  </p>
                  <div className="flex items-center gap-2 text-primary font-semibold cursor-pointer">
                    Explore SCF Catalog <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
              </div>

              <div className="bento-card">
                <div className="w-10 h-10 rounded-xl bg-info/20 flex items-center justify-center mb-4">
                  <Zap className="text-info w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2">Auto Gap Analysis</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Upload your evidence and let our agentic engine identify 
                  deficiencies against common security standards automatically.
                </p>
              </div>

              <div className="bento-card">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center mb-4">
                  <Lock className="text-success w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2">Secure by Default</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  End-to-end encryption for your documents. 
                  Neon-powered database isolation for your tenant data.
                </p>
              </div>

              <div className="bento-card">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center mb-4">
                  <Globe className="text-warning w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2">Hybrid Multi-cloud</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Deploy edge-ready compliance trackers across AWS, Azure, and GCP.
                </p>
              </div>

              <div className="bento-card col-span-1 md:col-span-2 overflow-hidden bg-gradient-to-br from-card to-background">
                <div className="p-2">
                   <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="text-primary w-5 h-5" />
                    Trusted by Innovators
                   </h3>
                   <div className="flex flex-wrap gap-x-8 gap-y-4 opacity-40 grayscale hover:grayscale-0 transition-all">
                      <span className="text-2xl font-black italic">CLOUDFLARE</span>
                      <span className="text-2xl font-black italic">VERCEL</span>
                      <span className="text-2xl font-black italic">NEON</span>
                      <span className="text-2xl font-black italic">LINODE</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 mb-20">
          <div className="container mx-auto px-6">
            <div className="rounded-[40px] bg-primary p-12 md:p-20 text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
               <div className="relative z-10">
                 <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                   Ready to set the standard?
                 </h2>
                 <p className="text-primary-foreground/80 text-lg mb-10 max-w-xl mx-auto">
                   Join security conscious organizations building the future of compliance.
                 </p>
                 <button 
                  onClick={() => navigate("/signup")}
                  className="bg-white text-primary hover:bg-white/90 font-bold py-4 px-10 rounded-full text-lg shadow-xl"
                >
                   Create your space
                 </button>
               </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-white/5 bg-background">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="font-brand text-xl tracking-tighter">
              <span className="brand-logo">standard<span className="brand-logo-dot">.</span></span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 Standard Cloud. Built for security, by security.
          </p>
          <div className="flex items-center gap-6">
             <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Privacy</a>
             <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Terms</a>
             <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
