import React from 'react';
import { PhoneCall, MessageSquare, Ticket, Sparkles, AlertTriangle } from 'lucide-react';

export function RightSidebarPanels() {
  const queues = [
    { name: 'General Support', count: 4, max: 10, color: 'bg-[#f97316]' },
    { name: 'Technical Support', count: 7, max: 10, color: 'bg-[#f97316]' },
    { name: 'Care Management Services', count: 2, max: 10, color: 'bg-[#eab308]' },
    { name: 'Billing & Payments', count: 1, max: 10, color: 'bg-[#22c55e]' },
    { name: 'Emergency Queue', count: 0, max: 10, color: 'bg-[#ef4444]' },
  ];

  const activityFeed = [
    { icon: PhoneCall, bg: 'bg-emerald-500/20', iconColor: 'text-emerald-500', title: 'Call Completed', desc: 'Raghav finished call with Arun M.', time: '2m ago' },
    { icon: Ticket, bg: 'bg-blue-500/20', iconColor: 'text-blue-500', title: 'Ticket Resolved', desc: 'Mani closed TKT-8942', time: '15m ago' },
    { icon: MessageSquare, bg: 'bg-[#25D366]/20', iconColor: 'text-[#25D366]', title: 'New WhatsApp', desc: 'Inquiry from +9198422...', time: '22m ago' },
    { icon: AlertTriangle, bg: 'bg-rose-500/20', iconColor: 'text-rose-500', title: 'SLA Warning', desc: 'Technical Support queue wait time > 5m', time: '1h ago' },
  ];

  const topAgents = [
    { rank: '1', name: 'Raghav', csat: '4.9', aht: '04:12', img: 'https://ui-avatars.com/api/?name=Raghav&background=0D8ABC&color=fff' },
    { rank: '2', name: 'Mani', csat: '4.8', aht: '03:45', img: 'https://ui-avatars.com/api/?name=Mani&background=0D8ABC&color=fff' },
    { rank: '3', name: 'Barani', csat: '4.7', aht: '04:30', img: 'https://ui-avatars.com/api/?name=Barani&background=0D8ABC&color=fff' },
  ];

  return (
    <div className="flex flex-col gap-4">
      
      {/* Queue Overview */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-white">Queue Overview</h3>
          <a href="#" className="text-[10px] text-primary font-semibold hover:underline">View All</a>
        </div>
        <div className="space-y-3">
          {queues.map((q, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-300 font-medium">{q.name}</span>
                <span className="text-xs font-mono text-white">{q.count}</span>
              </div>
              <div className="h-1.5 w-full bg-[#222] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${q.count === 0 ? 'bg-transparent' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, (q.count / q.max) * 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-[#222] my-1"></div>

      {/* Live Activity Feed */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-white">Live Activity Feed</h3>
          <a href="#" className="text-[10px] text-primary font-semibold hover:underline">View All</a>
        </div>
        <div className="space-y-3">
          {activityFeed.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex gap-3 items-start">
                <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{item.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">{item.desc}</p>
                </div>
                <span className="text-[9px] text-slate-500 font-medium shrink-0 pt-0.5">{item.time}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-[#222] my-1"></div>

      {/* Top Performing Agents */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-white">Top Performing Agents</h3>
          <select aria-label="Sidebar metrics timeframe" className="bg-[#111] border border-[#333] text-[9px] text-slate-400 rounded-md px-1 py-0.5 outline-none">
            <option>This Month</option>
          </select>
        </div>
        
        <div className="grid grid-cols-12 mb-1 px-1">
          <div className="col-span-8"></div>
          <div className="col-span-2 text-right text-[9px] text-slate-500 uppercase">CSAT</div>
          <div className="col-span-2 text-right text-[9px] text-slate-500 uppercase">AHT</div>
        </div>

        <div className="space-y-2">
          {topAgents.map((agent, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2 hover:bg-[#111] p-1 rounded-md transition-colors cursor-default">
              <div className="col-span-1 text-[10px] text-slate-500 text-center font-medium">{agent.rank}</div>
              <div className="col-span-7 flex items-center gap-2 overflow-hidden">
                <img src={agent.img} alt={agent.name} className="w-6 h-6 rounded-full border border-[#333]" />
                <span className="text-[11px] text-slate-300 font-medium truncate">{agent.name}</span>
              </div>
              <div className="col-span-2 text-right text-[11px] text-primary font-bold">{agent.csat}</div>
              <div className="col-span-2 text-right text-[11px] text-slate-400 font-mono">{agent.aht}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
