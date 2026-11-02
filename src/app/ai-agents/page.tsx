import React from 'react';
import { Users, Bot, Zap, Plus, Settings } from 'lucide-react';

export const metadata = {
  title: 'AI Agents | CRM Tool',
};

export default function AIAgentsPage() {
  const agents: any[] = [];

  return (
    <div className="flex-1 p-6 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="text-primary w-6 h-6" /> AI Agents
          </h1>
          <p className="text-sm text-slate-500">Manage autonomous agents and digital workers</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Agent
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {agents.map((agent, i) => (
          <div key={i} className="bg-[#050505] border border-[#222] rounded-xl overflow-hidden flex flex-col group">
            <div className="p-6 border-b border-[#222]">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${agent.bg}`}>
                  <Bot className={`w-6 h-6 ${agent.color}`} />
                </div>
                <button aria-label="AI agent options" className="p-2 text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{agent.name}</h3>
              <p className="text-xs text-slate-500">{agent.tasks}</p>
            </div>
            
            <div className="p-6 bg-[#0a0a0a] flex-1">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-slate-400">Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  agent.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {agent.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#222]">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Conversations</p>
                  <p className="text-lg font-bold text-white">{agent.handled}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Success Rate</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-white">{agent.successRate}</p>
                    <Zap className="w-3 h-3 text-amber-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add New Placeholder */}
        <div className="bg-[#050505] border-2 border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center p-6 text-slate-500 hover:border-primary hover:text-primary transition-colors cursor-pointer min-h-[300px]">
          <div className="w-12 h-12 rounded-full bg-[#111] flex items-center justify-center mb-4">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="font-bold">Deploy New Agent</h3>
          <p className="text-xs text-center mt-2 max-w-xs">Train a new AI agent on your knowledge base to handle repetitive tasks.</p>
        </div>
      </div>
    </div>
  );
}
