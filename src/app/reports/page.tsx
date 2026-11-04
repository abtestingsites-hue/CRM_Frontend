"use client";

import React, { useState, useEffect } from 'react';
import { useUnitStore } from '@/store/useUnitStore';
import { Globe, 
  BarChart3, PieChart, LineChart, Download, Calendar, Users, Briefcase, 
  FileSpreadsheet, Plus, Table, Play, Settings, Clock, Sparkles, Send, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Printer, Mail, CalendarDays, Sliders
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#ea580c', '#3b82f6', '#10b981', '#a855f7', '#eab308', '#ec4899'];

interface ReportConfig {
  id: string;
  name: string;
  kpis: { label: string; value: string; change: string; isPositive: boolean }[];
  chartData: { name: string; value: number }[];
  tableData: any[];
}

export default function ReportsPage() {
  const { selectedUnit, selectedUnitId } = useUnitStore();
  const [activeCategory, setActiveCategory] = useState<'client' | 'agent' | 'omnichannel' | 'conversion'>('client');
  const [selectedReportId, setSelectedReportId] = useState('cx_summary');
  
  // Advanced filters state
  const [startDate, setStartDate] = useState('2026-06-22');
  const [endDate, setEndDate] = useState('2026-07-22');
  const [agentFilter, setAgentFilter] = useState('All');
  const [teamFilter, setTeamFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [channelFilter, setChannelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Customization state
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [generatedData, setGeneratedData] = useState<ReportConfig | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [cronExpression, setCronExpression] = useState('0 9 * * 1');

  // Strict categories definition as per specifications
  const categories = {
    client: {
      label: 'Client Feedback Reports',
      items: [
        { id: 'cx_summary', name: 'Customer Feedback Summary' },
        { id: 'csat_report', name: 'Customer Satisfaction (CSAT)' },
        { id: 'nps_report', name: 'Net Promoter Score (NPS)' },
        { id: 'sentiment_report', name: 'Customer Sentiment Analysis' },
        { id: 'complaints_report', name: 'Customer Complaints Analysis' },
        { id: 'trends_report', name: 'Customer Feedback Trends' },
        { id: 'retention_report', name: 'Customer Retention Analysis' },
        { id: 'churn_report', name: 'Customer Churn Analysis' },
      ],
    },
    agent: {
      label: 'Agent Feedback Reports',
      items: [
        { id: 'agent_feedback', name: 'Agent Performance Feedback' },
        { id: 'cust_rating_agent', name: 'Customer Rating by Agent' },
        { id: 'supervisor_eval', name: 'Supervisor Evaluation' },
        { id: 'qa_report', name: 'Quality Assurance (QA) Report' },
        { id: 'agent_coaching', name: 'Agent Coaching Report' },
        { id: 'agent_productivity', name: 'Agent Productivity Analysis' },
        { id: 'team_comparison', name: 'Team Performance Comparison' },
      ],
    },
    omnichannel: {
      label: 'Omnichannel Reports',
      items: [
        { id: 'voice_perf', name: 'Voice Performance' },
        { id: 'outbound_perf', name: 'Outbound Calls Connection' },
        { id: 'whatsapp_perf', name: 'WhatsApp Performance' },
        { id: 'email_perf', name: 'Email Performance' },
        { id: 'livechat_perf', name: 'Live Chat Performance' },
        { id: 'channel_utilization', name: 'Channel Utilization' },
        { id: 'response_time', name: 'Response Time Analysis' },
        { id: 'resolution_time', name: 'Resolution Time Analysis' },
        { id: 'sla_compliance', name: 'SLA Compliance' },
      ],
    },
    conversion: {
      label: 'Conversion Reports',
      items: [
        { id: 'lead_conversion', name: 'Lead Conversion Report' },
        { id: 'cust_conversion', name: 'Customer Conversion Report' },
        { id: 'agent_conversion', name: 'Agent Conversion Rate' },
        { id: 'channel_conversion', name: 'Channel-wise Conversion' },
        { id: 'campaign_conversion', name: 'Campaign Conversion' },
        { id: 'sales_funnel', name: 'Sales Conversion Funnel' },
      ],
    },
  };

  useEffect(() => {
    handleGenerateReport();
  }, [selectedReportId, selectedUnitId]);

  useEffect(() => {
    const handleUnitChanged = () => {
      handleGenerateReport();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('crm-unit-changed', handleUnitChanged);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('crm-unit-changed', handleUnitChanged);
      }
    };
  }, []);

  const handleGenerateReport = () => {
    // Generate simulated dynamic payload matching selected options
    const mockConfigs: Record<string, ReportConfig> = {
      // 1. Client Feedback category presets
      cx_summary: {
        id: 'cx_summary',
        name: 'Customer Feedback Summary',
        kpis: [
          { label: 'Overall CX Rating', value: '4.8/5.0', change: '+2.4%', isPositive: true },
          { label: 'Feedbacks Logged', value: '842', change: '+14.5%', isPositive: true },
          { label: 'Unresolved Complaints', value: '18', change: '-8.2%', isPositive: true },
          { label: 'CSAT Average', value: '88.5%', change: '+3.1%', isPositive: true },
        ],
        chartData: [
          { name: 'Satisfied', value: 580 },
          { name: 'Neutral', value: 180 },
          { name: 'Dissatisfied', value: 82 },
        ],
        tableData: [
          { 'Feedback ID': 'FB-101', Customer: 'Vipin Kumar', Rating: '5 Stars', Comment: 'Excellent care services', Date: '2026-07-22' },
          { 'Feedback ID': 'FB-102', Customer: 'Aditya Sen', Rating: '4 Stars', Comment: 'Good support responses', Date: '2026-07-22' },
          { 'Feedback ID': 'FB-103', Customer: 'Karan Sharma', Rating: '2 Stars', Comment: 'Long wait queues', Date: '2026-07-21' },
        ],
      },
      csat_report: {
        id: 'csat_report',
        name: 'Customer Satisfaction (CSAT)',
        kpis: [
          { label: 'Average CSAT Index', value: '88.5%', change: '+4.2%', isPositive: true },
          { label: 'Target SLA CSAT', value: '90.0%', change: '-1.5%', isPositive: false },
          { label: 'Responses Count', value: '620', change: '+12.4%', isPositive: true },
          { label: 'Top Segment', value: 'Voice Call', change: 'Stable', isPositive: true },
        ],
        chartData: [
          { name: 'Satisfied (5 Stars)', value: 420 },
          { name: 'Neutral (3 Stars)', value: 130 },
          { name: 'Dissatisfied (1 Star)', value: 70 },
        ],
        tableData: [
          { 'CSAT Log': 'CS-401', Agent: 'Raghav', Customer: 'Vipin Kumar', Score: '95%', Date: '2026-07-22' },
          { 'CSAT Log': 'CS-402', Agent: 'Agent Smith', Customer: 'Aditya Sen', Score: '84%', Date: '2026-07-22' },
        ],
      },
      nps_report: {
        id: 'nps_report',
        name: 'Net Promoter Score (NPS)',
        kpis: [
          { label: 'NPS Score', value: '72', change: '+4', isPositive: true },
          { label: 'Promoters Share', value: '78%', change: '+3%', isPositive: true },
          { label: 'Detractors Share', value: '6%', change: '-1%', isPositive: true },
          { label: 'Passive Share', value: '16%', change: '-2%', isPositive: true },
        ],
        chartData: [
          { name: 'Promoters', value: 78 },
          { name: 'Passives', value: 16 },
          { name: 'Detractors', value: 6 },
        ],
        tableData: [
          { ID: 'NPS-901', Respondent: 'Raghavan Pillai', Category: 'Promoter', Score: '10', Date: '2026-07-22' },
        ],
      },
      sentiment_report: {
        id: 'sentiment_report',
        name: 'Customer Sentiment Analysis',
        kpis: [
          { label: 'Positive Ratio', value: '65.2%', change: '+5.4%', isPositive: true },
          { label: 'Neutral Ratio', value: '24.8%', change: '-2.1%', isPositive: true },
          { label: 'Negative Ratio', value: '10.0%', change: '-3.3%', isPositive: true },
          { label: 'Analyzer Precision', value: '94.2%', change: '+1.5%', isPositive: true },
        ],
        chartData: [
          { name: 'Positive Sentiment', value: 65 },
          { name: 'Neutral Sentiment', value: 25 },
          { name: 'Negative Sentiment', value: 10 },
        ],
        tableData: [
          { Log: 'SNT-021', Customer: 'Vipin Kumar', Sentiment: 'Positive', Confidence: '98%', Date: '2026-07-22' },
        ],
      },
      complaints_report: {
        id: 'complaints_report',
        name: 'Customer Complaints Analysis',
        kpis: [
          { label: 'Total Complaints', value: '38', change: '-12.4%', isPositive: true },
          { label: 'Resolved Tickets', value: '30', change: '+8.1%', isPositive: true },
          { label: 'Resolution Rate', value: '78.9%', change: '+4.2%', isPositive: true },
          { label: 'Average Resolve Time', value: '4h 12m', change: '-24m', isPositive: true },
        ],
        chartData: [
          { name: 'IVR Link Setup', value: 15 },
          { name: 'Profile Sync Issue', value: 12 },
          { name: 'Call Drops', value: 11 },
        ],
        tableData: [
          { Ticket: 'TK-590', Subject: 'IVR Link Setup', Status: 'Open', Priority: 'High' },
        ],
      },

      // 2. Agent Feedback category presets
      agent_feedback: {
        id: 'agent_feedback',
        name: 'Agent Performance Feedback',
        kpis: [
          { label: 'Evaluations Conducted', value: '24', change: '+14.2%', isPositive: true },
          { label: 'Average Rating Score', value: '4.5/5.0', change: '+0.2', isPositive: true },
          { label: 'Supervisor Approvals', value: '92%', change: '+2.1%', isPositive: true },
          { label: 'SLA Compliant Ratio', value: '96.2%', change: '+1.5%', isPositive: true },
        ],
        chartData: [
          { name: 'Excellent', value: 18 },
          { name: 'Satisfactory', value: 5 },
          { name: 'Coaching Required', value: 1 },
        ],
        tableData: [
          { ID: 'EV-840', Agent: 'Raghav', Rating: '5.0', Evaluator: 'Supervisor', Date: '2026-07-22' },
        ],
      },
      cust_rating_agent: {
        id: 'cust_rating_agent',
        name: 'Customer Rating by Agent',
        kpis: [
          { label: 'Top Rated Agent', value: 'Raghav (4.8)', change: 'Consistent', isPositive: true },
          { label: 'Low Rating Alert Count', value: '1', change: '-2', isPositive: true },
          { label: 'Feedback Responses', value: '842', change: '+14.5%', isPositive: true },
          { label: 'SLA Compliant', value: '96.2%', change: '+1.5%', isPositive: true },
        ],
        chartData: [
          { name: 'Raghav', value: 98 },
          { name: 'Agent Smith', value: 85 },
          { name: 'Agent 3', value: 72 },
        ],
        tableData: [
          { Agent: 'Raghav', Rating: '4.8 Stars', Interactions: '420', Date: '2026-07-22' },
        ],
      },

      // 3. Omnichannel category presets
      voice_perf: {
        id: 'voice_perf',
        name: 'Voice Performance',
        kpis: [
          { label: 'Voice Calls Connected', value: '420', change: '+12.4%', isPositive: true },
          { label: 'Avg Talk Time', value: '2m 45s', change: 'Optimal', isPositive: true },
          { label: 'Queue Abandonment', value: '2%', change: '-1.5%', isPositive: true },
          { label: 'FCR Voice', value: '78.2%', change: '+4.1%', isPositive: true },
        ],
        chartData: [
          { name: 'Inbound connected', value: 310 },
          { name: 'Outbound connected', value: 110 },
        ],
        tableData: [
          { CallID: 'CALL-840', Agent: 'Raghav', Direction: 'Inbound', Duration: '4m 12s', Date: '2026-07-22' },
        ],
      },
      outbound_perf: {
        id: 'outbound_perf',
        name: 'Outbound Calls Connection',
        kpis: [
          { label: 'Outbound Attempted', value: '850', change: '+18.5%', isPositive: true },
          { label: 'Calls Connected', value: '420', change: '+12.4%', isPositive: true },
          { label: 'Connection Rate', value: '49.4%', change: '-2.1%', isPositive: false },
          { label: 'Avg Talk Time', value: '3m 15s', change: '+15s', isPositive: true },
        ],
        chartData: [
          { name: 'Connected', value: 420 },
          { name: 'Voicemail', value: 210 },
          { name: 'No Answer', value: 150 },
          { name: 'Rejected', value: 70 },
        ],
        tableData: [
          { CallID: 'OUT-101', Agent: 'Raghav', Customer: 'Vipin Kumar', Status: 'Connected', Duration: '4m 12s', Date: '2026-07-22' },
          { CallID: 'OUT-102', Agent: 'Agent Smith', Customer: 'Aditya Sen', Status: 'Voicemail', Duration: '0m 45s', Date: '2026-07-22' },
          { CallID: 'OUT-103', Agent: 'Raghav', Customer: 'Karan Sharma', Status: 'No Answer', Duration: '0m 00s', Date: '2026-07-21' },
        ],
      },
      whatsapp_perf: {
        id: 'whatsapp_perf',
        name: 'WhatsApp Performance',
        kpis: [
          { label: 'WhatsApp Sent', value: '2,840', change: '+14.2%', isPositive: true },
          { label: 'WhatsApp Received', value: '1,950', change: '+10.5%', isPositive: true },
          { label: 'Avg Response Delay', value: '1m 15s', change: '-45s', isPositive: true },
          { label: 'Delivery Success Rate', value: '99.8%', change: 'Optimal', isPositive: true },
        ],
        chartData: [
          { name: 'Outgoing Messages', value: 2840 },
          { name: 'Incoming Messages', value: 1950 },
        ],
        tableData: [
          { MsgID: 'WA-904', Number: '98452 11029', Status: 'Delivered', Direction: 'Outbound', Date: '2026-07-22' },
        ],
      },

      // 4. Conversion category presets
      lead_conversion: {
        id: 'lead_conversion',
        name: 'Lead Conversion Report',
        kpis: [
          { label: 'Total Leads Pool', value: '184', change: '+12.4%', isPositive: true },
          { label: 'Converted Accounts', value: '78', change: '+9.4%', isPositive: true },
          { label: 'Conversion Yield', value: '42.5%', change: '+3.1%', isPositive: true },
          { label: 'Pipeline Val', value: '$840,250', change: '+14.2%', isPositive: true },
        ],
        chartData: [
          { name: 'New Leads', value: 184 },
          { name: 'Assigned', value: 165 },
          { name: 'Contacted', value: 130 },
          { name: 'Won Converted', value: 78 },
        ],
        tableData: [
          { LeadID: 'L-102', Name: 'Vipin Kumar', Org: 'UEC Health', Status: 'Converted', Date: '2026-07-22' },
        ],
      },
    };

    const fallback: ReportConfig = {
      id: selectedReportId,
      name: categories[activeCategory].items.find(i => i.id === selectedReportId)?.name || 'Analytical Report',
      kpis: [
        { label: 'Total Volume', value: '1,420', change: '+12.4%', isPositive: true },
        { label: 'SLA Performance', value: '96.2%', change: '+1.5%', isPositive: true },
        { label: 'Active Channels', value: '4 Count', change: 'Optimal', isPositive: true },
        { label: 'Avg Cycle Duration', value: '4m 12s', change: '-24s', isPositive: true },
      ],
      chartData: [
        { name: 'Volume Metrics A', value: 450 },
        { name: 'Volume Metrics B', value: 300 },
        { name: 'Volume Metrics C', value: 150 },
      ],
      tableData: [
        { ID: 'REC-501', Category: 'Standard Log', Performance: 'SLA Compliant', Agent: 'Raghav', Date: '2026-07-22' },
        { ID: 'REC-502', Category: 'Secondary Log', Performance: 'Alert Warning', Agent: 'Agent Smith', Date: '2026-07-22' },
      ],
    };

    setGeneratedData(mockConfigs[selectedReportId] || fallback);
  };

  const handleExportCSV = () => {
    if (!generatedData || !generatedData.tableData || generatedData.tableData.length === 0) return;
    const activeUnitLabel = selectedUnit ? `${selectedUnit.code} - ${selectedUnit.name}` : 'All Units (Consolidated)';
    const rawKeys = Object.keys(generatedData.tableData[0]);
    const headers = ['Business Unit', ...rawKeys].join(',');
    const rows = generatedData.tableData.map(row => 
      [`"${activeUnitLabel}"`, ...rawKeys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`)].join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${generatedData.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full bg-[#050505] text-white">
      {/* 1. Left Sidebar: Categories list */}
      <aside className="w-72 border-r border-[#1e1e1e] bg-[#090909] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#1e1e1e]">
          <h2 className="text-sm font-black tracking-wider uppercase text-slate-400 flex items-center gap-2">
            <BarChart3 className="text-orange-500 w-4 h-4" /> Reports Center
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {(Object.keys(categories) as Array<keyof typeof categories>).map((catKey) => {
            const cat = categories[catKey];
            return (
              <div key={catKey} className="space-y-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2 block">
                  {cat.label}
                </span>
                <div className="space-y-0.5">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveCategory(catKey);
                        setSelectedReportId(item.id);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all border ${
                        selectedReportId === item.id 
                          ? 'bg-orange-600/15 border-orange-500/20 text-orange-500 shadow-lg shadow-orange-500/5' 
                          : 'text-slate-400 hover:bg-[#121212] hover:text-white border-transparent'
                      }`}
                    >
                      <span className="truncate max-w-[200px]">{item.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* 2. Main Content Board */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Advanced Filter Panel */}
        <header className="border-b border-[#1e1e1e] bg-[#090909] p-4 flex flex-col gap-4 shrink-0">
          <div className="flex flex-wrap items-end gap-3.5">
            {/* Start Date */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Start Date</span>
              <input aria-label="Report start date" 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#141414] border border-[#222] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>
            {/* End Date */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">End Date</span>
              <input aria-label="Report end date" 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#141414] border border-[#222] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>
            {/* Agent filter */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Agent</span>
              <select 
                aria-label="Filter by agent" value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="bg-[#141414] border border-[#222] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-orange-500 w-32"
              >
                <option value="All">All Agents</option>
                <option value="Raghav">Raghav</option>
                <option value="AgentSmith">Agent Smith</option>
              </select>
            </div>
            {/* Team filter */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Team</span>
              <select 
                aria-label="Filter by team" value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="bg-[#141414] border border-[#222] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-orange-500 w-32"
              >
                <option value="All">All Teams</option>
                <option value="North">North Hub</option>
                <option value="West">West Division</option>
              </select>
            </div>
            {/* Department filter */}
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Department</span>
              <select 
                aria-label="Filter by department" value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-[#141414] border border-[#222] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-orange-500 w-36"
              >
                <option value="All">All Departments</option>
                <option value="Sales">Sales Division</option>
                <option value="Care">Care Support</option>
              </select>
            </div>

            <button 
              onClick={handleGenerateReport}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(234,88,12,0.1)] transition-all h-8"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </button>
          </div>

          {/* Export & Actions Toolbar */}
          <div className="flex items-center justify-between border-t border-[#1c1c1c] pt-3">
            <h1 className="text-sm font-bold text-white tracking-wide truncate max-w-[400px]">
              {generatedData?.name}
            </h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsScheduleOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] hover:bg-[#202020] border border-[#222] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all"
                title="Schedule email dispatch"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Schedule</span>
              </button>
              <button 
                onClick={() => setIsEmailOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] hover:bg-[#202020] border border-[#222] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all"
                title="Email copy"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] hover:bg-[#202020] border border-[#222] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all"
                title="Print report"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] hover:bg-[#202020] border border-[#222] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </header>

        {/* Work Area Viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#050505]">
          {generatedData && (
            <>
              {/* Dynamic KPI summary row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {generatedData.kpis.map((kpi, idx) => (
                  <div key={idx} className="bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl p-5 flex flex-col justify-between h-[130px] hover:border-[#2b2b2b] transition-all">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                    <div className="flex items-end justify-between mt-2">
                      <h3 className="text-2xl font-extrabold text-white tracking-tight">{kpi.value}</h3>
                      <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                        kpi.isPositive 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      }`}>
                        {kpi.isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{kpi.change}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart customizer area */}
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Report Visualizations</h3>
                  <div className="flex items-center bg-[#141414] border border-[#222] p-0.5 rounded-lg">
                    <button 
                      onClick={() => setChartType('bar')} 
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${chartType === 'bar' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                      Bar
                    </button>
                    <button 
                      onClick={() => setChartType('line')} 
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${chartType === 'line' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                      Line
                    </button>
                    <button 
                      onClick={() => setChartType('pie')} 
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${chartType === 'pie' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}
                    >
                      Pie
                    </button>
                  </div>
                </div>

                <div className="h-[280px]">
                  {chartType === 'line' ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <RechartsLineChart data={generatedData.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                        <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
                        <YAxis stroke="#555" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="value" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 4 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  ) : chartType === 'pie' ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <RechartsPieChart>
                        <Pie
                          data={generatedData.chartData}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {generatedData.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} />
                        <Legend verticalAlign="bottom" height={36} iconSize={8} formatter={(value) => <span className="text-[10px] text-slate-400 font-bold uppercase">{value}</span>} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <BarChart data={generatedData.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                        <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
                        <YAxis stroke="#555" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="#ea580c" radius={[4, 4, 0, 0]}>
                          {generatedData.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Data Table Grid */}
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Detailed Data Grid</h3>
                <div className="border border-[#1c1c1c] rounded-xl overflow-hidden">
                  <table aria-label="Generated analytics report data table" className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#121212] border-b border-[#1c1c1c] text-slate-400 font-bold uppercase tracking-wider">
                        {Object.keys(generatedData.tableData[0]).map(key => (
                          <th key={key} className="p-3 font-semibold">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c1c1c]/50">
                      {generatedData.tableData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#121212]/30 transition-colors text-slate-300">
                          {Object.values(row).map((val: any, cellIdx) => (
                            <td key={cellIdx} className="p-3 font-medium">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* SCHEDULE REPORT DIALOG MODAL */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#1e1e1e]">
              <h2 className="text-md font-bold text-white">Schedule Report Dispatch</h2>
              <p className="text-xs text-slate-500 mt-1">Configure automated dispatch frequency (cron notation).</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cron Schedule Pattern</label>
                <input aria-label="Cron schedule expression" 
                  type="text" 
                  value={cronExpression} 
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="e.g. 0 9 * * 1" 
                  className="w-full bg-[#141414] border border-[#262626] focus:border-orange-500 rounded-lg px-3 py-2 text-sm text-white outline-none" 
                />
                <span className="text-[9px] text-slate-500">Defaults to: Every Monday at 9:00 AM</span>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#1e1e1e]">
                <button type="button" onClick={() => setIsScheduleOpen(false)} className="px-4 py-2 bg-[#141414] border border-[#262626] text-white hover:bg-[#202020] rounded-lg text-xs font-semibold">
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsScheduleOpen(false);
                    alert(`Report dispatch successfully scheduled for: ${cronExpression}`);
                  }} 
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-[0_0_15px_rgba(234,88,12,0.1)]"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL REPORT MODAL */}
      {isEmailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#1e1e1e]">
              <h2 className="text-md font-bold text-white">Email Analytical Report</h2>
              <p className="text-xs text-slate-500 mt-1">Send a copy of the active report to an administrator email.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient Email Address</label>
                <input aria-label="Recipient email address" 
                  type="email" 
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. Raghav@uec.com" 
                  className="w-full bg-[#141414] border border-[#262626] focus:border-orange-500 rounded-lg px-3 py-2 text-sm text-white outline-none" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#1e1e1e]">
                <button type="button" onClick={() => setIsEmailOpen(false)} className="px-4 py-2 bg-[#141414] border border-[#262626] text-white hover:bg-[#202020] rounded-lg text-xs font-semibold">
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEmailOpen(false);
                    alert(`Report file successfully queued and sent to: ${emailInput}`);
                  }} 
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-[0_0_15px_rgba(234,88,12,0.1)]"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
