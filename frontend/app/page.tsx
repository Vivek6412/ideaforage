import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#f97316 1px, transparent 1px), linear-gradient(90deg, #f97316 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          AI-powered product builder
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
          From idea
          <br />
          <span className="text-transparent bg-clip-text gradient-forge">
            to deployed.
          </span>
        </h1>

        <p className="text-zinc-400 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
          Describe your idea. IdeaForge clarifies, blueprints, engineers, and
          ships a production app to GitHub — autonomously.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="px-8 py-3 rounded-lg font-semibold text-white gradient-forge hover:opacity-90 transition-opacity text-base w-full sm:w-auto"
          >
            Start building free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 rounded-lg font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors text-base w-full sm:w-auto"
          >
            Sign in
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap justify-center gap-2">
          {[
            "Structured clarification",
            "Blueprint generation",
            "Prompt engineering",
            "Claude Code execution",
            "GitHub push",
            "Vercel + Railway deploy",
          ].map((f) => (
            <span
              key={f}
              className="px-3 py-1 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-full"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}