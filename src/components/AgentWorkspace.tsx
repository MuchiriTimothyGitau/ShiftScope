import { useState } from 'react';
import {
  Brain, Network, Globe, Zap, Cpu, Info, Play,
  ShieldAlert, ArrowRight, LineChart
} from 'lucide-react';

interface AgentWorkspaceProps {
  activePackageName: string;
  isAgentRunning: boolean;
  agentResult: any;
  agentError: string | null;
  displayedLogs: string[];
  onTriggerAgent: () => void;
  onSetPackageName: (name: string) => void;
}

const graphWidth = 400;
const graphHeight = 240;

function getCoords(index: number, total: number) {
  if (total <= 1) return { x: graphWidth / 2, y: graphHeight / 2 };
  const angle = (index / total) * 2 * Math.PI;
  const radius = 70;
  const cx = graphWidth / 2;
  const cy = graphHeight / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
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

export function AgentWorkspace({
  activePackageName, isAgentRunning, agentResult, agentError,
  displayedLogs, onTriggerAgent, onSetPackageName
}: AgentWorkspaceProps) {
  const [agentWorkspaceTab, setAgentWorkspaceTab] = useState<'chain' | 'graph' | 'brightdata' | 'triggerware'>('chain');
  const [selectedNode, setSelectedNode] = useState<any>(null);

  if (!agentResult && !isAgentRunning) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-5 min-h-[460px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-505 animate-pulse" />
              <span>CYBERSECURITY ACTIVE INTELLIGENCE AGENT</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              Inspecting Package: <span className="text-indigo-400 font-mono">{activePackageName}</span>
            </h3>
          </div>
          <div className="relative shrink-0 flex items-center gap-2">
            <input
              type="text"
              value={activePackageName}
              onChange={(e) => onSetPackageName(e.target.value)}
              placeholder="Search package name..."
              className="pl-3 pr-10 py-2 w-44 text-xs font-bold font-mono bg-slate-900 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={onTriggerAgent}
              disabled={!activePackageName}
              className="absolute right-2 p-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white rounded-lg transition-all cursor-pointer"
            >
              <Play className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="border border-slate-850 bg-slate-900/20 rounded-2xl flex flex-col justify-center items-center text-center p-8 flex-1">
          <div className="w-14 h-14 bg-slate-900/60 rounded-xl border border-slate-800 shadow-inner flex items-center justify-center mb-4">
            <Cpu className="w-6 h-6 text-slate-500" />
          </div>
          <h4 className="text-sm font-bold text-slate-350">Cybersecurity Solver Idle</h4>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed mt-1 font-semibold">
            Select a dependency node or enter a query above and strike execution to activate the active IP proxies, build memory maps, and test code diffs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col gap-5">
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-indigo-505 animate-pulse" />
            <span>CYBERSECURITY ACTIVE INTELLIGENCE AGENT</span>
          </div>
          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-1">
            Inspecting Package: <span className="text-indigo-400 font-mono">{activePackageName}</span>
          </h3>
        </div>

        <div className="relative shrink-0 flex items-center gap-2">
          <input
            type="text"
            value={activePackageName}
            onChange={(e) => onSetPackageName(e.target.value)}
            placeholder="Search package name..."
            className="pl-3 pr-10 py-2 w-44 text-xs font-bold font-mono bg-slate-900 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={onTriggerAgent}
            disabled={isAgentRunning || !activePackageName}
            className="absolute right-2 p-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white rounded-lg transition-all cursor-pointer"
          >
            <Play className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isAgentRunning ? (
        <div className="bg-slate-900/50 border border-slate-850 rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[460px]">
          <div className="relative w-16 h-16 rounded-full border-4 border-slate-805 border-t-indigo-500 animate-spin flex items-center justify-center mb-4">
            <Network className="w-6 h-6 text-indigo-400 absolute" />
          </div>
          <h4 className="text-sm font-bold text-slate-100">Scraper Agents routing active via Residential Proxy Nodes...</h4>
          <p className="text-[11px] text-slate-400 max-w-sm mt-1.5 leading-relaxed font-semibold">
            Unlocking web signals, scraping issue headers, building the Cognee cognitive graph databases, and orchestrating the 5-step Gemini code diff model.
          </p>
          <div className="w-full max-w-md mt-6 bg-slate-950 border border-slate-850 rounded-xl p-3 text-left font-mono text-[9px] text-slate-400 space-y-1.5 overflow-y-auto max-h-[160px] custom-scrollbar">
            {displayedLogs.map((log, lidx) => (
              <div key={lidx} className="flex gap-1">
                <span className="text-slate-600 select-none font-bold">{lidx + 1}.</span>
                <span className={log.includes('[Bright Data]') ? 'text-emerald-400' : log.includes('[Cognee]') ? 'text-cyan-400' : 'text-slate-300'}>
                  {log}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {agentError && (
            <div className="p-3.5 bg-rose-950/20 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 inline mr-1" /> {agentError}
            </div>
          )}

          <div className="bg-slate-900/40 border border-indigo-950 rounded-xl p-4 flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="w-5.5 h-5.5 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Active Agent Audit Summary</h4>
              <p className="text-xs leading-relaxed font-semibold text-slate-200">
                {agentResult?.summary}
              </p>
            </div>
          </div>

          <div className="flex border-b border-slate-800 p-1 bg-slate-900/40 rounded-xl gap-1">
            {([
              { key: 'chain', label: '5-Step AI Chain' },
              { key: 'graph', label: 'Cognee Memory Graph' },
              { key: 'brightdata', label: 'Bright Data Scrapers' },
              { key: 'triggerware', label: 'TriggerWare PRs' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setAgentWorkspaceTab(tab.key)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  agentWorkspaceTab === tab.key
                    ? 'bg-slate-900 border border-slate-800/80 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-1 min-h-[350px]">
            {agentWorkspaceTab === 'chain' && agentResult?.steps && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    Gemini Multi-Stage Prompt Pipeline [Module 5]
                  </h4>
                </div>
                <div className="space-y-3">
                  {agentResult.steps.map((step: any, sidx: number) => (
                    <div key={sidx} className="border border-slate-850 rounded-xl bg-slate-900/10 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-100 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-705 flex items-center justify-center text-[10px] font-mono text-indigo-400 font-bold">
                            {sidx + 1}
                          </span>
                          {step.name}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-500">
                          Model: <span className="text-indigo-400">{step.model}</span>
                        </span>
                      </div>

                      {step.isDiff ? (
                        <div className="space-y-3 pt-1">
                          <p className="text-[11px] font-semibold text-slate-400">{step.explanation}</p>
                          <div className="border border-slate-850 rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-2 text-[10px] font-mono bg-slate-950">
                            <div className="border-b md:border-b-0 md:border-r border-slate-850">
                              <div className="px-3 py-1 bg-rose-950/20 text-rose-400 text-[9px] font-extrabold uppercase border-b border-slate-850">
                                Original (Vulnerable)
                              </div>
                              <pre className="p-3 text-rose-300 bg-rose-950/10 h-full max-h-[120px] overflow-y-auto select-all whitespace-pre">
                                {step.beforeCode}
                              </pre>
                            </div>
                            <div>
                              <div className="px-3 py-1 bg-emerald-950/30 text-emerald-400 text-[9px] font-extrabold uppercase border-b border-slate-850">
                                Patched (Remediated)
                              </div>
                              <pre className="p-3 text-emerald-250 bg-emerald-950/10 h-full max-h-[120px] overflow-y-auto select-all whitespace-pre">
                                {step.afterCode}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] leading-relaxed text-slate-350 pl-7 whitespace-pre-line font-semibold">
                          {step.output}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agentWorkspaceTab === 'graph' && agentResult?.cognee && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
                    Cognee long-term memory graph indexes [Module 4]
                  </h4>
                </div>

                <div className="border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden relative min-h-[250px] flex flex-col justify-between">
                  <div className="absolute top-2.5 left-2.5 text-[9px] text-slate-500 font-mono font-black italic">
                    Click nodes to pull relational attributes:
                  </div>

                  <svg className="w-full h-[230px] select-none">
                    <defs>
                      <marker id="custom-arrow" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                      </marker>
                    </defs>

                    {agentResult.cognee.edges?.map((edge: any, eidx: number) => {
                      const nodes = agentResult.cognee.nodes || [];
                      const src = nodes.findIndex((n: any) => n.id === edge.source);
                      const tgt = nodes.findIndex((n: any) => n.id === edge.target);
                      if (src === -1 || tgt === -1) return null;
                      const sc = getCoords(src, nodes.length);
                      const tc = getCoords(tgt, nodes.length);
                      return (
                        <g key={`edge-${eidx}`}>
                          <line x1={sc.x} y1={sc.y} x2={tc.x} y2={tc.y} stroke="#334155" strokeWidth="1.5" markerEnd="url(#custom-arrow)" />
                          <text x={(sc.x + tc.x) / 2} y={(sc.y + tc.y) / 2 - 4} textAnchor="middle" className="text-[8px] font-extrabold fill-slate-500 font-mono">
                            {edge.relation}
                          </text>
                        </g>
                      );
                    })}

                    {agentResult.cognee.nodes?.map((node: any, idx: number) => {
                      const nodes = agentResult.cognee.nodes || [];
                      const coords = getCoords(idx, nodes.length);
                      const isSelected = selectedNode?.id === node.id;

                      let colorClass = 'fill-indigo-950/60 stroke-indigo-500/80';
                      if (node.label === 'Vulnerability') colorClass = 'fill-rose-950/60 stroke-rose-500/80';
                      else if (node.label === 'License') colorClass = 'fill-amber-950/60 stroke-amber-500/80';
                      else if (node.label === 'Policy') colorClass = 'fill-violet-950/60 stroke-violet-500/80';
                      else if (node.label === 'Action') colorClass = 'fill-emerald-950/60 stroke-emerald-500/80';

                      return (
                        <g key={`node-${idx}`} transform={`translate(${coords.x}, ${coords.y})`} className="cursor-pointer" onClick={() => setSelectedNode(node)}>
                          <circle r={isSelected ? "17" : "14"} className={`${colorClass} transition-all duration-200 stroke-2`} />
                          <text textAnchor="middle" dy=".3em" className="text-[10px] select-none fill-white">
                            {node.label === 'Vulnerability' ? '!' : node.label === 'License' ? 'L' : node.label === 'Policy' ? 'P' : node.label === 'Action' ? 'A' : 'P'}
                          </text>
                          <text textAnchor="middle" y="21" className="text-[8px] font-black tracking-tight font-mono select-none fill-slate-300">
                            {node.name.length > 15 ? node.name.slice(0, 12) + '...' : node.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div className="bg-slate-900 border-t border-slate-800 p-3 h-20 text-[10px] leading-relaxed flex items-center">
                    {selectedNode ? (
                      <div>
                        <p className="font-extrabold text-white flex items-center gap-1.5">
                          <span className="uppercase text-[8px] bg-slate-800 text-slate-300 font-mono px-1 py-0.2 rounded border border-slate-700">{selectedNode.label}</span>
                          {selectedNode.name}
                        </p>
                        <p className="text-slate-450 font-semibold leading-normal mt-0.5">
                          Mapped node inside Cognee relational similarity graph (vector coordinate ID: `{selectedNode.id}`).
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-500 font-semibold italic text-center w-full">Click any graph node to inspect memory parameters.</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-[11px] leading-relaxed text-slate-300 space-y-1">
                  <span className="block font-black uppercase text-[9px] tracking-widest text-indigo-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    Cognee long-term metadata memo report:
                  </span>
                  <p className="whitespace-pre-line font-semibold text-slate-200">
                    {agentResult.cognee.memoryReport}
                  </p>
                </div>
              </div>
            )}

            {agentWorkspaceTab === 'brightdata' && agentResult?.brightdata && (
              <div className="space-y-4 text-slate-300 text-xs font-medium">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    Bright Data Web crawler scraper parameters [Module 3]
                  </h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Proxy Pool</p>
                    <p className="text-xs font-black text-white mt-1">72M+ Residential IPs</p>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Requests routed</p>
                    <p className="text-xs font-black text-white mt-1">{agentResult.brightdata.routed} redirect nodes</p>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Bytes scraped</p>
                    <p className="text-xs font-black text-white mt-1">~{(agentResult.brightdata.bytes / 1024).toFixed(1)} KB</p>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Proxy Gateway</p>
                    <p className="text-xs font-mono font-bold text-indigo-405 mt-1 truncate select-all">{agentResult.brightdata.pool}</p>
                  </div>
                </div>

                <div className="border border-slate-800 bg-slate-950/50 rounded-xl p-4 text-[11px] leading-relaxed text-slate-400 space-y-1.5 font-semibold">
                  <span className="block font-black text-emerald-400 uppercase text-[9px] tracking-widest bg-emerald-955 border border-emerald-900 w-fit px-1.5 py-0.5 rounded">Scraped Target Details:</span>
                  <p className="whitespace-pre-line text-slate-300">{agentResult.brightdata.scraped}</p>
                </div>
              </div>
            )}

            {agentWorkspaceTab === 'triggerware' && agentResult?.triggerware && (
              <div className="space-y-4 text-slate-300 text-xs font-medium">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-violet-400" />
                    TriggerWare automated event dispatches [Module 6]
                  </h4>
                  <div className="flex items-center gap-1 text-[9px] bg-violet-950 text-violet-300 px-2 py-0.5 rounded border border-violet-900 font-bold uppercase">
                    Score: {agentResult.triggerware.correlationScore}%
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agentResult.triggerware.actions?.map((act: any, idx: number) => (
                    <div key={idx} className="border border-slate-850 bg-slate-900/10 hover:border-violet-950 rounded-xl p-4 space-y-3 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                        <h5 className="font-extrabold text-xs text-slate-100">{act.name}</h5>
                      </div>
                      <p className="text-[11px] text-slate-400 font-semibold">{act.details}</p>
                      <div className="bg-slate-950 p-3 text-slate-300 font-mono text-[9px] leading-relaxed rounded-xl max-h-[140px] overflow-y-auto whitespace-pre-wrap select-all">
                        {act.output}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
