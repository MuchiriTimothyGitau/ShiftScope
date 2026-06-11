import { Database, FileCode } from 'lucide-react';

interface Dependency {
  name: string;
  ecosystem: string;
  pinned_version: string;
  version_spec: string;
  is_direct: boolean;
  is_dev: boolean;
  status: string;
}

interface DependencyRegistryProps {
  dependencies: Dependency[];
  activePackageName: string;
  onSelectPackage: (name: string) => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'vuln':
      return { color: 'border-rose-900/60 bg-rose-950/20 text-rose-300', label: 'Vulnerable' };
    case 'license':
      return { color: 'border-amber-900/60 bg-amber-950/20 text-amber-350', label: 'License Warning' };
    case 'legacy':
      return { color: 'border-orange-900/60 bg-orange-950/20 text-orange-350', label: 'Outdated / Bloat' };
    default:
      return { color: 'border-slate-800 bg-slate-900/20 text-slate-350', label: 'Verified Safe' };
  }
}

export function DependencyRegistry({ dependencies, activePackageName, onSelectPackage }: DependencyRegistryProps) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4.5 h-4.5 text-emerald-400" />
          <h3 className="text-sm font-black text-white tracking-tight">Normalized Dependency Registry</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-405 bg-emerald-955 border border-emerald-900 px-1.5 py-0.5 rounded text-emerald-400">
          {dependencies.length} Nodes parsed
        </span>
      </div>

      {dependencies.length === 0 ? (
        <div className="text-center py-8 text-slate-500 space-y-2">
          <FileCode className="w-8 h-8 mx-auto stroke-1" />
          <p className="text-xs font-semibold">Parser is empty. Ingest package manifests above to populate.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[290px] overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">
            Select a parsed node below to launch autonomous agent analysis:
          </p>
          {dependencies.map((dep, idx) => {
            const isActive = activePackageName.toLowerCase() === dep.name.toLowerCase();
            const badge = getStatusBadge(dep.status);

            return (
              <div
                key={idx}
                onClick={() => onSelectPackage(dep.name)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group select-none ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-600/80 shadow-md ring-1 ring-indigo-505/20'
                    : 'bg-slate-900/30 hover:bg-slate-900/70 border-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-100 truncate group-hover:text-white transition-colors">
                      {dep.name}
                    </span>
                    <span className="text-[9px] px-1 bg-slate-800 text-slate-400 font-mono rounded">
                      {dep.ecosystem}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-1 text-[10px] text-slate-400">
                    <span className="font-mono">Pinned: {dep.pinned_version || 'latest'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span>{dep.is_dev ? 'DevDependency' : 'DirectDependency'}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border inline-block tracking-tight ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
