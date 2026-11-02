"use client";

import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, Users, Calendar, Download, Plus, 
  Sparkles, CheckCircle2, ChevronRight, Sliders, BarChart2, ShieldAlert,
  ArrowUpRight, ArrowDownRight, UserCheck, Percent, HelpCircle, BarChart3, LineChart as LineIcon,
  X, Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  LineChart, Line, Legend, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';

interface TargetConfig {
  id: string;
  scope: 'Agent' | 'Team' | 'Department' | 'Organization';
  period: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  targetValue: number;
  achievedValue: number;
  assignee: string;
}

const COLORS = ['#ea580c', '#3b82f6', '#10b981', '#a855f7', '#eab308'];

export default function TargetManagementPage() {
  const [activeTab, setActiveTab] = useState<'targets' | 'forecasts' | 'insights'>('targets');
  
  // Target Scope filters inside targets list
  const [targetFilter, setTargetFilter] = useState<'All' | 'Organization' | 'Team' | 'Agent'>('All');
  
  // Modal toggle for target setting
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Dynamic Chart toggles for enterprise interaction
  const [forecastChartType, setForecastChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [sourceChartType, setSourceChartType] = useState<'bar' | 'pie'>('bar');
  const [comparisonChartType, setComparisonChartType] = useState<'bar' | 'line'>('bar');

  // User profile state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('crm_user');
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          setCurrentUser(userObj);
          const admin = userObj.role === 'SUPER_ADMIN' || userObj.name?.toLowerCase() === 'raghav';
          setIsSuperAdmin(admin);
        } catch (e) {
          setIsSuperAdmin(true);
        }
      } else {
        setIsSuperAdmin(true);
      }
    }
  }, []);

  const [targets, setTargets] = useState<TargetConfig[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('crm_conversion_targets');
      if (cached) {
        setTargets(JSON.parse(cached));
      } else {
        const defaultTargets: TargetConfig[] = [
          { id: '1', scope: 'Organization', period: 'Monthly', targetValue: 150, achievedValue: 62, assignee: 'CRM Tool' },
          { id: '2', scope: 'Team', period: 'Weekly', targetValue: 35, achievedValue: 24, assignee: 'Sales North' },
          { id: '3', scope: 'Agent', period: 'Daily', targetValue: 8, achievedValue: 5, assignee: 'Raghav' },
          { id: '4', scope: 'Agent', period: 'Daily', targetValue: 8, achievedValue: 6, assignee: 'Mani' },
          { id: '5', scope: 'Agent', period: 'Daily', targetValue: 6, achievedValue: 3, assignee: 'Barani' },
          { id: '6', scope: 'Agent', period: 'Daily', targetValue: 8, achievedValue: 4, assignee: 'Agent Smith' },
        ];
        setTargets(defaultTargets);
        localStorage.setItem('crm_conversion_targets', JSON.stringify(defaultTargets));
      }
    }
  }, []);

  // Target creation form state
  const [newScope, setNewScope] = useState<'Agent' | 'Team' | 'Department' | 'Organization'>('Agent');
  const [newPeriod, setNewPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [newAssignee, setNewAssignee] = useState('');
  const [newTargetVal, setNewTargetVal] = useState(15);

  // Filter targets based on user role and tab filter selection
  const visibleTargets = targets.filter(t => {
    // 1. Role based checks
    if (!isSuperAdmin && currentUser) {
      if (t.scope === 'Agent' && t.assignee.toLowerCase() !== currentUser.name?.toLowerCase()) {
        return false;
      }
    }
    // 2. Tab filter scope checks
    if (targetFilter !== 'All') {
      return t.scope === targetFilter;
    }
    return true; 
  });

  const handleAddTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignee.trim()) return;

    const t: TargetConfig = {
      id: Date.now().toString(),
      scope: newScope,
      period: newPeriod,
      targetValue: Number(newTargetVal),
      achievedValue: 0,
      assignee: newAssignee,
    };
    const updated = [t, ...targets];
    setTargets(updated);
    localStorage.setItem('crm_conversion_targets', JSON.stringify(updated));
    setNewAssignee('');
    setNewTargetVal(15);
    setIsFormOpen(false); // Close form modal
  };

  const handleResetDefaults = () => {
    const defaultTargets: TargetConfig[] = [
      { id: '1', scope: 'Organization', period: 'Monthly', targetValue: 150, achievedValue: 62, assignee: 'CRM Tool' },
      { id: '2', scope: 'Team', period: 'Weekly', targetValue: 35, achievedValue: 24, assignee: 'Sales North' },
      { id: '3', scope: 'Agent', period: 'Daily', targetValue: 8, achievedValue: 5, assignee: 'Raghav' },
      { id: '4', scope: 'Agent', period: 'Daily', targetValue: 8, achievedValue: 6, assignee: 'Mani' },
      { id: '5', scope: 'Agent', period: 'Daily', targetValue: 6, achievedValue: 3, assignee: 'Barani' },
      { id: '6', scope: 'Agent', period: 'Daily', targetValue: 8, achievedValue: 4, assignee: 'Agent Smith' },
    ];
    setTargets(defaultTargets);
    localStorage.setItem('crm_conversion_targets', JSON.stringify(defaultTargets));
  };

  // Calculations for dynamic header widgets
  const activeTargetsCount = visibleTargets.length;
  const sumTargetConversions = visibleTargets.reduce((sum, t) => sum + t.targetValue, 0);
  const sumAchievedConversions = visibleTargets.reduce((sum, t) => sum + t.achievedValue, 0);
  const overallAttainmentRate = sumTargetConversions > 0 ? Math.round((sumAchievedConversions / sumTargetConversions) * 100) : 0;

  const totalOrgTarget = targets
    .filter(t => t.scope === 'Organization' || t.scope === 'Team')
    .reduce((sum, t) => sum + t.targetValue, 0) || 185;

  const expectedConversions = Math.round(totalOrgTarget * 0.72);
  const forecastedLeadVolume = Math.round(totalOrgTarget * 1.8);
  const targetMultiplier = totalOrgTarget / 185;

  // Base forecast scaled dynamically
  const baseForecastChartData = [
    { name: 'Week 1', Forecast: Math.round(110 * targetMultiplier), Actual: Math.round(102 * targetMultiplier) },
    { name: 'Week 2', Forecast: Math.round(135 * targetMultiplier), Actual: Math.round(128 * targetMultiplier) },
    { name: 'Week 3', Forecast: Math.round(120 * targetMultiplier), Actual: Math.round(115 * targetMultiplier) },
    { name: 'Week 4', Forecast: Math.round(160 * targetMultiplier), Actual: Math.round(148 * targetMultiplier) },
  ];

  // Lead source volume forecast breakdown data
  const forecastedSourcesData = [
    { name: 'Google Organic', value: Math.round(180 * targetMultiplier) },
    { name: 'Direct Traffic', value: Math.round(120 * targetMultiplier) },
    { name: 'WhatsApp Campaign', value: Math.round(110 * targetMultiplier) },
    { name: 'Email Outreach', value: Math.round(90 * targetMultiplier) },
  ];

  const agentTargets = targets.filter(t => t.scope === 'Agent');

  const handleExportCSV = () => {
    const headers = "Assignee,Scope,Period,Target,Achieved,Percentage\n";
    const rows = targets.map(t => 
      `"${t.assignee}","${t.scope}","${t.period}",${t.targetValue},${t.achievedValue},${Math.round((t.achievedValue/t.targetValue)*100)}%`
    ).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "crm_targets_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#050505] text-white">
      {/* 1. Header Toolbar */}
      <header className="border-b border-[#1e1e1e] bg-[#090909] p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <Target className="text-orange-500 w-5 h-5 animate-pulse" />
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider">Target Management</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Corporate KPI metrics & conversion forecasting</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action to create dynamic conversion target modal */}
          {activeTab === 'targets' && isSuperAdmin && (
            <button 
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(234,88,12,0.1)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Target</span>
            </button>
          )}

          <div className="flex bg-[#141414] border border-[#222] p-0.5 rounded-lg">
            <button 
              onClick={() => setActiveTab('targets')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${activeTab === 'targets' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              Targets
            </button>
            <button 
              onClick={() => setActiveTab('forecasts')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${activeTab === 'forecasts' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              Forecasts
            </button>
            <button 
              onClick={() => setActiveTab('insights')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${activeTab === 'insights' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              Agent Comparisons
            </button>
          </div>

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] hover:bg-[#202020] border border-[#222] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* 2. Main Content Board */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
        
        {/* TAB 1: CONVERSION TARGETS (Centralized Workspace) */}
        {activeTab === 'targets' && (
          <div className="space-y-6">
            
            {/* Enterprise KPI metrics summary row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Conversion Goals Set</span>
                <span className="text-3xl font-extrabold text-white block mt-1.5">{sumTargetConversions} Conversions</span>
                <span className="text-[10px] text-slate-600 block mt-1">Aggregated target value</span>
              </div>
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Completed Conversions</span>
                <span className="text-3xl font-extrabold text-white block mt-1.5">{sumAchievedConversions} Accounts</span>
                <span className="text-[10px] text-emerald-400 block mt-1">Achieved to date</span>
              </div>
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Overall Attainment</span>
                <span className="text-3xl font-extrabold text-white block mt-1.5">{overallAttainmentRate}%</span>
                <span className="text-[10px] text-slate-600 block mt-1">Completion performance index</span>
              </div>
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active Goal Records</span>
                <span className="text-3xl font-extrabold text-white block mt-1.5">{activeTargetsCount} Records</span>
                <span className="text-[10px] text-slate-600 block mt-1">Total active scope lines</span>
              </div>
            </div>

            {/* Scope Filter Tabs */}
            <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3.5">
              <div className="flex bg-[#0e0e0e] border border-[#222] p-0.5 rounded-lg">
                <button onClick={() => setTargetFilter('All')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${targetFilter === 'All' ? 'bg-[#1e1e1e] text-white' : 'text-slate-500 hover:text-white'}`}>All Scope</button>
                <button onClick={() => setTargetFilter('Organization')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${targetFilter === 'Organization' ? 'bg-[#1e1e1e] text-white' : 'text-slate-500 hover:text-white'}`}>Organization</button>
                <button onClick={() => setTargetFilter('Team')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${targetFilter === 'Team' ? 'bg-[#1e1e1e] text-white' : 'text-slate-500 hover:text-white'}`}>Team</button>
                <button onClick={() => setTargetFilter('Agent')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${targetFilter === 'Agent' ? 'bg-[#1e1e1e] text-white' : 'text-slate-500 hover:text-white'}`}>Agent</button>
              </div>

              {isSuperAdmin && (
                <button 
                  onClick={handleResetDefaults} 
                  className="text-[10px] font-bold text-slate-500 hover:text-orange-500 uppercase tracking-wider transition-all"
                >
                  Reset Defaults
                </button>
              )}
            </div>

            {/* Grid of Targets cards (expanded to full-width) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleTargets.length > 0 ? (
                visibleTargets.map((t) => {
                  const percent = Math.min(Math.round((t.achievedValue / t.targetValue) * 100), 100);
                  return (
                    <div key={t.id} className="bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl p-5 hover:border-[#2b2b2b] transition-all space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-extrabold text-orange-500 uppercase tracking-widest px-2 py-0.5 bg-orange-600/10 rounded-full">{t.period} Target</span>
                          <h4 className="text-sm font-bold text-white mt-1.5">{t.assignee} ({t.scope})</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Achieved / Goal</span>
                          <span className="text-sm font-black text-white block mt-0.5">{t.achievedValue} / {t.targetValue}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                          <span>Progress</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="w-full bg-[#161616] h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-1000" 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center text-slate-500 border border-dashed border-[#1e1e1e] rounded-2xl text-xs">
                  No targets mapped for this filter scope.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FORECASTED LEADS */}
        {activeTab === 'forecasts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Forecasted Lead Volume</span>
                <span className="text-3xl font-extrabold text-white block mt-1.5">{forecastedLeadVolume} Leads</span>
                <span className="text-[10px] text-slate-600 block mt-1">Scale based on active targets</span>
              </div>
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Expected Conversions</span>
                <span className="text-3xl font-extrabold text-white block mt-1.5">{expectedConversions} Accounts</span>
                <span className="text-[10px] text-emerald-400 block mt-1">+4.2% CSAT yield projected</span>
              </div>
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Forecast Accuracy index</span>
                <span className="text-3xl font-extrabold text-white block mt-1.5">94.2%</span>
                <span className="text-[10px] text-slate-600 block mt-1">Optimal precision threshold</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Forecast vs Actual */}
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Forecast vs Actual Performance</h3>
                  <div className="flex bg-[#141414] border border-[#222] p-0.5 rounded-lg">
                    <button onClick={() => setForecastChartType('line')} className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all ${forecastChartType === 'line' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}>Line</button>
                    <button onClick={() => setForecastChartType('bar')} className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all ${forecastChartType === 'bar' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}>Bar</button>
                    <button onClick={() => setForecastChartType('area')} className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all ${forecastChartType === 'area' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}>Area</button>
                  </div>
                </div>

                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    {forecastChartType === 'bar' ? (
                      <BarChart data={baseForecastChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                        <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
                        <YAxis stroke="#555" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} />
                        <Legend verticalAlign="top" height={36} iconSize={8} formatter={(value) => <span className="text-[10px] text-slate-400 font-bold uppercase">{value}</span>} />
                        <Bar dataKey="Forecast" fill="#ea580c" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : forecastChartType === 'area' ? (
                      <AreaChart data={baseForecastChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                        <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
                        <YAxis stroke="#555" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} />
                        <Legend verticalAlign="top" height={36} iconSize={8} formatter={(value) => <span className="text-[10px] text-slate-400 font-bold uppercase">{value}</span>} />
                        <defs>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="Forecast" stroke="#ea580c" fillOpacity={1} fill="url(#colorForecast)" strokeWidth={2} />
                        <Area type="monotone" dataKey="Actual" stroke="#3b82f6" fillOpacity={1} fill="url(#colorActual)" strokeWidth={2} />
                      </AreaChart>
                    ) : (
                      <LineChart data={baseForecastChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                        <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
                        <YAxis stroke="#555" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} />
                        <Legend verticalAlign="top" height={36} iconSize={8} formatter={(value) => <span className="text-[10px] text-slate-400 font-bold uppercase">{value}</span>} />
                        <Line type="monotone" dataKey="Forecast" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Actual" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Projected Lead Source */}
              <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projected Lead Source Breakdown</h3>
                  <div className="flex bg-[#141414] border border-[#222] p-0.5 rounded-lg">
                    <button onClick={() => setSourceChartType('bar')} className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all ${sourceChartType === 'bar' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}>Bar</button>
                    <button onClick={() => setSourceChartType('pie')} className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all ${sourceChartType === 'pie' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}>Pie</button>
                  </div>
                </div>

                <div className="h-[280px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    {sourceChartType === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={forecastedSourcesData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {forecastedSourcesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} />
                        <Legend verticalAlign="bottom" height={36} iconSize={8} formatter={(value) => <span className="text-[9px] text-slate-400 font-bold uppercase">{value}</span>} />
                      </PieChart>
                    ) : (
                      <BarChart data={forecastedSourcesData} layout="vertical" margin={{ top: 5, right: 10, left: 25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" horizontal={false} />
                        <XAxis type="number" stroke="#555" fontSize={9} />
                        <YAxis type="category" dataKey="name" stroke="#555" fontSize={9} width={90} />
                        <Tooltip contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="#ea580c" radius={[0, 4, 4, 0]}>
                          {forecastedSourcesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INSIGHTS & AGENT COMPARISONS */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agent Comparative Target vs Achieved Conversions</h3>
                <div className="flex bg-[#141414] border border-[#222] p-0.5 rounded-lg">
                  <button onClick={() => setComparisonChartType('bar')} className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all ${comparisonChartType === 'bar' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}>Bar</button>
                  <button onClick={() => setComparisonChartType('line')} className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all ${comparisonChartType === 'line' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`}>Line</button>
                </div>
              </div>

              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  {comparisonChartType === 'line' ? (
                    <LineChart data={agentTargets} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                      <XAxis dataKey="assignee" stroke="#555" fontSize={10} tickLine={false} />
                      <YAxis stroke="#555" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} />
                      <Legend verticalAlign="top" height={36} iconSize={8} formatter={(value) => <span className="text-[10px] text-slate-400 font-bold uppercase">{value}</span>} />
                      <Line type="monotone" dataKey="targetValue" name="Target Goal" stroke="#555" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="achievedValue" name="Achieved Conversions" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <BarChart data={agentTargets} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                      <XAxis dataKey="assignee" stroke="#555" fontSize={10} tickLine={false} />
                      <YAxis stroke="#555" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#090909', borderColor: '#222', borderRadius: '8px' }} />
                      <Legend verticalAlign="top" height={36} iconSize={8} formatter={(value) => <span className="text-[10px] text-slate-400 font-bold uppercase">{value}</span>} />
                      <Bar dataKey="targetValue" name="Target Goal" fill="#222" radius={[4, 4, 0, 0]} stroke="#444" strokeWidth={1} />
                      <Bar dataKey="achievedValue" name="Achieved Conversions" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparison Grid Table */}
            <div className="bg-[#0b0b0b] border border-[#1e1e1e] p-5 rounded-2xl">
              <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Detailed Agent Comparison Grid</h3>
              <div className="border border-[#1c1c1c] rounded-xl overflow-hidden">
                <table aria-label="Team performance targets table" className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#121212] border-b border-[#1c1c1c] text-slate-400 font-bold uppercase tracking-wider">
                      <th scope="col" className="p-3 font-semibold">Agent Name</th>
                      <th scope="col" className="p-3 font-semibold text-right">Target Assigned</th>
                      <th scope="col" className="p-3 font-semibold text-right">Conversions Completed</th>
                      <th scope="col" className="p-3 font-semibold text-right">Attainment Rate %</th>
                      <th scope="col" className="p-3 font-semibold text-right">SLA SLA Compliance</th>
                      <th scope="col" className="p-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c1c1c]/50 text-slate-300">
                    {agentTargets.map((agent) => {
                      const attainment = Math.round((agent.achievedValue / agent.targetValue) * 100);
                      const slaVal = agent.assignee === 'Raghav' ? '96.2%' : agent.assignee === 'Mani' ? '98.0%' : '94.8%';
                      return (
                        <tr key={agent.id} className="hover:bg-[#121212]/30 transition-colors">
                          <td className="p-3 font-bold text-white">{agent.assignee}</td>
                          <td className="p-3 text-right font-medium">{agent.targetValue} Conversions</td>
                          <td className="p-3 text-right font-black text-orange-500">{agent.achievedValue} Conversions</td>
                          <td className="p-3 text-right">
                            <span className={`font-bold ${attainment >= 70 ? 'text-emerald-400' : attainment >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {attainment}%
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-400">{slaVal}</td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${attainment >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'}`}>
                              {attainment >= 70 ? 'On Track' : 'Needs Review'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE TARGET MODAL DIALOG (Salesforce-grade popup) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-[#1e1e1e]">
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <Target className="text-orange-500 w-5 h-5" /> Set Conversion Target
              </h2>
              <p className="text-xs text-slate-500 mt-1">Configure goals for organization divisions, regional teams, or agents.</p>
            </div>

            <form onSubmit={handleAddTarget} className="p-6 space-y-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Target Scope</span>
                <select 
                  aria-label="Target Scope" value={newScope} 
                  onChange={(e: any) => setNewScope(e.target.value)}
                  className="bg-[#141414] border border-[#222] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                >
                  <option value="Agent">Agent Goal</option>
                  <option value="Team">Team Goal</option>
                  <option value="Department">Department Goal</option>
                  <option value="Organization">Organization Goal</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Goal Level Period</span>
                <select 
                  aria-label="Target Period" value={newPeriod} 
                  onChange={(e: any) => setNewPeriod(e.target.value)}
                  className="bg-[#141414] border border-[#222] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Assignee / Target Name</span>
                <select
                  aria-label="Target Assignee" value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="bg-[#141414] border border-[#222] focus:border-orange-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="">-- Select Assignee --</option>
                  <option value="Raghav">Raghav</option>
                  <option value="Mani">Mani</option>
                  <option value="Barani">Barani</option>
                  <option value="Agent Smith">Agent Smith</option>
                  <option value="Sales North">Sales North (Team)</option>
                  <option value="CRM Tool">CRM Tool (Organization)</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Conversion Count Target</span>
                <input aria-label="Conversion count target" 
                  type="number" 
                  value={newTargetVal} 
                  onChange={(e) => setNewTargetVal(Number(e.target.value))}
                  className="bg-[#141414] border border-[#222] focus:border-orange-500 rounded-lg px-3 py-2 text-xs text-white outline-none" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1e1e1e]">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)} 
                  className="px-4 py-2 bg-[#141414] border border-[#262626] text-white hover:bg-[#202020] rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-[0_0_15px_rgba(234,88,12,0.1)] animate-pulse"
                >
                  Set Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
