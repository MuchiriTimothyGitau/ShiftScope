import { useState } from 'react';
import { Upload, RefreshCw, ShieldCheck } from 'lucide-react';
import { PRESET_TEMPLATES } from '../data/presets.js';

interface IngestionPanelProps {
  packageJsonInput: string;
  isAnalysing: boolean;
  queueProgress: number;
  onInputChange: (value: string) => void;
  onAnalyze: () => void;
  onSelectPreset: (key: string) => void;
}

export function IngestionPanel({
  packageJsonInput,
  isAnalysing,
  queueProgress,
  onInputChange,
  onAnalyze,
  onSelectPreset,
}: IngestionPanelProps) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Upload className="w-4.5 h-4.5 text-indigo-400" />
          <h3 className="text-sm font-black text-white tracking-tight">Ecosystem File Ingestion [Module 2]</h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 uppercase font-mono">
          Multi-Format Parser
        </span>
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Select Ecosystem Template Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PRESET_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              onClick={() => onSelectPreset(key)}
              className="p-2 text-left border border-slate-850 hover:border-indigo-600 rounded-xl bg-slate-900/40 hover:bg-slate-900 transition-all text-xs cursor-pointer focus:outline-none"
            >
              <span className="block font-bold text-slate-100 truncate">{template.name}</span>
              <span className="block text-[9px] text-slate-400 truncate mt-0.5">{template.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span>Paste contents or raw code snippet below:</span>
          <span className="font-mono text-[9px] text-indigo-300 uppercase">Detects automatically</span>
        </div>
        <textarea
          value={packageJsonInput}
          onChange={(e) => onInputChange(e.target.value)}
          rows={8}
          className="w-full font-mono text-xs p-3.5 bg-slate-900/50 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold leading-relaxed"
          placeholder="Paste files (package.json, yarn.lock, requirements.txt)..."
          spellCheck="false"
        />
      </div>

      <button
        onClick={onAnalyze}
        disabled={isAnalysing}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
      >
        {isAnalysing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-300" />
            <span>Processing Queue Nodes... {queueProgress}%</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4.5 h-4.5" />
            <span>Execute Global Compliance Diagnostics [Module 1]</span>
          </>
        )}
      </button>
    </div>
  );
}
