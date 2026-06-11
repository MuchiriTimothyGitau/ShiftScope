import { Database, Trash2, RefreshCw } from 'lucide-react';

interface QueueTelemetryProps {
  redisStats: any;
  queueMode: 'redis' | 'in_memory' | null;
  jobId: string | null;
  isPurging: boolean;
  onPurge: () => void;
}

export function QueueTelemetry({ redisStats, queueMode, jobId, isPurging, onPurge }: QueueTelemetryProps) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Upstash Queue Telemetry</h3>
        </div>
        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-extrabold border ${
          redisStats?.connected ? 'bg-emerald-955 border-emerald-900 text-emerald-400' : 'bg-amber-955 border-amber-900 text-amber-400'
        }`}>
          {redisStats?.connected ? 'UPSTASH VERIFIED' : 'LOCAL SIMULATOR'}
        </span>
      </div>

      <div className="p-3 bg-slate-900/50 border border-slate-850 rounded-xl text-[11px] font-mono space-y-1 text-slate-400">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-300">BullMQ Connection</span>
          <span className="text-[9px] text-indigo-400 bg-indigo-950/40 border border-indigo-900 px-1 py-0.2 rounded font-sans uppercase">TLS Override</span>
        </div>
        <p className="truncate select-all">{redisStats?.url || 'In-Memory Simulation Queue Loop Active'}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-900/35 p-3 rounded-xl border border-slate-850">
        <div>
          <p className="text-slate-500 font-bold uppercase tracking-wider">Queue Interface</p>
          <p className="text-slate-350 font-semibold mt-0.5">Engine: {queueMode || 'Upstash secured'}</p>
        </div>
        <div>
          <p className="text-slate-500 font-bold uppercase tracking-wider">Active Job ID</p>
          <p className="text-slate-350 font-semibold mt-0.5 truncate" title={jobId || ''}>{jobId || 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-slate-900 border border-slate-850 p-2 rounded-xl text-xs">
          <p className="text-[9px] font-bold text-slate-400 font-mono">WAIT</p>
          <p className="font-mono font-black text-slate-205 mt-0.5">{redisStats?.counts?.waiting || 0}</p>
        </div>
        <div className="bg-indigo-950/20 border border-indigo-900 p-2 rounded-xl text-xs">
          <p className="text-[9px] font-bold text-indigo-400 font-mono">ACTV</p>
          <p className="font-mono font-black text-indigo-305 mt-0.5">{redisStats?.counts?.active || 0}</p>
        </div>
        <div className="bg-emerald-955 border border-emerald-900 p-2 rounded-xl text-xs">
          <p className="text-[9px] font-bold text-emerald-400 font-mono">COMP</p>
          <p className="font-mono font-black text-emerald-305 mt-0.5">{redisStats?.counts?.completed || 0}</p>
        </div>
        <div className="bg-rose-955 border border-rose-900 p-2 rounded-xl text-xs">
          <p className="text-[9px] font-bold text-rose-400 font-mono">FAIL</p>
          <p className="font-mono font-black text-rose-305 mt-0.5">{redisStats?.counts?.failed || 0}</p>
        </div>
      </div>

      <button
        onClick={onPurge}
        disabled={isPurging}
        className="w-full py-2 border border-slate-800 hover:border-rose-900 hover:bg-rose-950/10 text-slate-400 hover:text-rose-300 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
      >
        {isPurging ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Flashing active buffers...</span>
          </>
        ) : (
          <>
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Purge BullMQ Queue Buffer</span>
          </>
        )}
      </button>
    </div>
  );
}
