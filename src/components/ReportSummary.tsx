import { LineChart, ArrowRight } from 'lucide-react';

interface ReportSummaryProps {
  analysisResult: any;
}

function getRatingBadgeColor(rating: string) {
  switch (rating) {
    case 'A': return 'bg-emerald-600 border-emerald-700 text-white';
    case 'B': return 'bg-indigo-600 border-indigo-700 text-white';
    case 'C': return 'bg-orange-500 border-orange-600 text-white';
    case 'D': return 'bg-rose-500 border-rose-600 text-white';
    case 'F': return 'bg-rose-700 border-rose-800 text-white';
    default: return 'bg-slate-600 border-slate-700 text-white';
  }
}

export function ReportSummary({ analysisResult }: ReportSummaryProps) {
  if (!analysisResult) return null;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-black text-white tracking-tight">Executive Compliance Diagnostic Report</h3>
        </div>
        <div className={`text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-2 border ${getRatingBadgeColor(analysisResult.rating)}`}>
          <span>Hygiene Rating:</span>
          <span className="font-extrabold text-sm">{analysisResult.rating}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Weight Penalty</p>
          <p className="text-xl font-extrabold text-white mt-1">~{analysisResult.sizeKb} KB</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Legacy Paths</p>
          <p className={`text-xl font-extrabold mt-1 ${analysisResult.outdatedCount > 0 ? 'text-amber-500' : 'text-emerald-400'}`}>
            {analysisResult.outdatedCount}
          </p>
        </div>
        <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vulnerabilities</p>
          <p className={`text-xl font-extrabold mt-1 ${analysisResult.vulnerabilitiesCount > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
            {analysisResult.vulnerabilitiesCount}
          </p>
        </div>
        <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">License Warnings</p>
          <p className={`text-xl font-extrabold mt-1 ${analysisResult.licenseIssuesCount > 0 ? 'text-orange-500' : 'text-emerald-400'}`}>
            {analysisResult.licenseIssuesCount}
          </p>
        </div>
      </div>

      <div className="bg-slate-900/30 p-4 border border-slate-850 rounded-xl space-y-3 font-semibold text-xs leading-relaxed text-slate-350">
        <span className="block font-black uppercase text-[9px] tracking-widest text-slate-500">Analysis Summary:</span>
        <p className="leading-relaxed">{analysisResult.detailedSummary}</p>
      </div>

      <div className="space-y-2 mt-4">
        <h5 className="text-[10px] font-bold text-slate-550 uppercase tracking-widest pl-1">Actionable Mitigation Checklist</h5>
        {analysisResult.recommendations?.map((rec: string, i: number) => (
          <div key={i} className="flex gap-2.5 items-start p-3 border border-slate-850 bg-slate-900/10 rounded-xl text-xs font-semibold text-slate-300">
            <ArrowRight className="w-4 h-4 text-indigo-505 shrink-0" />
            <span>{rec}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
