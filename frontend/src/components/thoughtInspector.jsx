import React, { useState } from "react";
import { 
  Brain, 
  Network, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  FileText, 
  Code2, 
  ShieldCheck, 
  Cpu, 
  Sparkles,
  Zap,
  Activity,
  Layers
} from "lucide-react";

export const ThoughtInspector = ({ 
  thoughtSteps = [], 
  executionTrace = [], 
  telemetry = {}, 
  isDeepResearch = false,
  artifacts = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("thoughts");

  const hasThoughts = Array.isArray(thoughtSteps) && thoughtSteps.length > 0;
  const hasTraces = Array.isArray(executionTrace) && executionTrace.length > 0;

  if (!hasThoughts && !hasTraces && !isDeepResearch) {
    return null;
  }

  const durationSec = telemetry?.totalDurationSec || (telemetry?.totalDurationMs ? (telemetry.totalDurationMs / 1000).toFixed(2) : "1.2");
  const agentName = telemetry?.agent || "AgentMesh";

  const getStepIcon = (type) => {
    switch (type) {
      case "research":
        return <Search className="w-3.5 h-3.5 text-amber-400" />;
      case "rag":
        return <FileText className="w-3.5 h-3.5 text-rose-400" />;
      case "a2a":
        return <Network className="w-3.5 h-3.5 text-cyan-400" />;
      case "reflection":
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case "coding":
        return <Code2 className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Brain className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="mb-3 w-full max-w-3xl rounded-xl border border-slate-700/60 bg-slate-900/80 shadow-lg backdrop-blur-md transition-all">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center justify-between px-3.5 py-2.5 hover:bg-slate-800/40 select-none"
      >
        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-purple-300">
            <Brain className="w-3.5 h-3.5 animate-pulse text-purple-400" />
            <span>Agent Reasoning & Telemetry</span>
          </span>

          {isDeepResearch && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300 border border-amber-500/30">
              🔬 DEEP RESEARCH
            </span>
          )}

          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
            ⚡ {durationSec}s
          </span>

          {telemetry?.totalTokens && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
              🪙 {telemetry.totalTokens} tokens
            </span>
          )}
        </div>

        <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200">
          <span className="text-[11px] font-medium">{isOpen ? "Hide Details" : "Inspect Execution Graph"}</span>
          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-800/80 p-3.5">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab("thoughts")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                activeTab === "thoughts"
                  ? "bg-purple-600/30 text-purple-200 border border-purple-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Brain className="w-3 h-3" />
              Thought Steps ({thoughtSteps.length})
            </button>

            <button
              onClick={() => setActiveTab("graph")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                activeTab === "graph"
                  ? "bg-cyan-600/30 text-cyan-200 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3 h-3" />
              Agent Mesh Graph Inspector
            </button>
          </div>

          {activeTab === "thoughts" && (
            <div className="space-y-2.5">
              {thoughtSteps.length === 0 ? (
                <div className="text-xs text-slate-400">Direct autonomous execution completed.</div>
              ) : (
                thoughtSteps.map((step, idx) => (
                  <div 
                    key={step.id || idx}
                    className="flex items-start gap-2.5 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/60"
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs">
                      {getStepIcon(step.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200">{step.title}</span>
                        <span className="text-[10px] text-slate-500">{step.timestamp || "Active"}</span>
                      </div>
                      {step.detail && (
                        <p className="mt-0.5 text-xs text-slate-400 leading-relaxed font-mono">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "graph" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-950/80 p-3 border border-slate-800">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Execution Topology
                </div>

                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  <div className="flex flex-col items-center rounded-lg bg-slate-800/90 px-3 py-2 border border-slate-700 min-w-[90px] shrink-0 text-center">
                    <span className="text-[10px] font-bold text-slate-400">INPUT</span>
                    <span className="text-xs font-medium text-slate-200">User Query</span>
                  </div>

                  <span className="text-slate-500 text-xs">➔</span>

                  <div className="flex flex-col items-center rounded-lg bg-purple-950/60 px-3 py-2 border border-purple-700/60 min-w-[100px] shrink-0 text-center">
                    <span className="text-[10px] font-bold text-purple-400">ROUTER</span>
                    <span className="text-xs font-medium text-purple-200">StateGraph</span>
                  </div>

                  <span className="text-slate-500 text-xs">➔</span>

                  <div className="flex flex-col items-center rounded-lg bg-cyan-950/60 px-3 py-2 border border-cyan-700/60 min-w-[110px] shrink-0 text-center">
                    <span className="text-[10px] font-bold text-cyan-400">EXECUTOR</span>
                    <span className="text-xs font-medium text-cyan-200">{agentName}</span>
                  </div>

                  {isDeepResearch && (
                    <>
                      <span className="text-slate-500 text-xs">➔</span>
                      <div className="flex flex-col items-center rounded-lg bg-amber-950/60 px-3 py-2 border border-amber-700/60 min-w-[120px] shrink-0 text-center">
                        <span className="text-[10px] font-bold text-amber-400">A2A MESH (x3)</span>
                        <span className="text-xs font-medium text-amber-200">webAgent</span>
                      </div>
                    </>
                  )}

                  {artifacts.length > 0 && (
                    <>
                      <span className="text-slate-500 text-xs">➔</span>
                      <div className="flex flex-col items-center rounded-lg bg-emerald-950/60 px-3 py-2 border border-emerald-700/60 min-w-[110px] shrink-0 text-center">
                        <span className="text-[10px] font-bold text-emerald-400">ARTIFACT</span>
                        <span className="text-xs font-medium text-emerald-200">{artifacts[0]?.type?.toUpperCase()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Latency</div>
                  <div className="font-bold text-slate-200">{durationSec}s</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Topology Status</div>
                  <div className="font-bold text-emerald-400">SUCCESS</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                  <div className="text-[10px] text-slate-500">A2A Protocol</div>
                  <div className="font-bold text-cyan-400">Active Mesh</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Artifacts</div>
                  <div className="font-bold text-purple-300">{artifacts.length} Compiled</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThoughtInspector;
