import { ShieldCheck, Cpu } from 'lucide-react';

interface HeaderProps {
  redisStats: any;
  apiMode: 'gemini' | 'local_fallback';
}

export function Header({ redisStats, apiMode }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">ShiftScope</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800/60 text-indigo-300 font-mono">STRICT-SEC-v3</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Asynchronous Dependency Security & Pre-CVE Automated Memory Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="hidden md:flex items-center gap-1.5 border border-slate-800 bg-slate-900 rounded-lg py-1 px-3 text-slate-400">
            <span className={`w-2 h-2 rounded-full ${redisStats?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
            <span className="font-mono text-[11px] font-bold">{redisStats?.connected ? 'Upstash Cluster: Secured' : 'InMemory Sim Loop'}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono font-bold uppercase rounded border border-slate-800 px-3 py-1 bg-slate-900 text-slate-300">
            <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{apiMode === 'gemini' ? 'Gemini 2.0' : 'Deterministic fallback'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
