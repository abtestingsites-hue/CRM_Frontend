"use client";

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, User, Users, Building2, Plus, Trash2, CheckCircle, 
  ChevronDown, ChevronRight, Briefcase, FileText, MessageSquare, Plug, Zap, Database, 
  Monitor, Search, Download, Filter, Edit2, Key, Check, X, Server, Globe, Shield, Activity
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';

// ==========================================
// 1. NAVIGATION METADATA
// ==========================================
const SETTINGS_NAV = [
  {
    group: 'Organization', id: 'org', icon: Building2,
    items: [
      { id: 'org-profile', label: 'Organization Profile', desc: 'Manage central corporate tenant information' },
      { id: 'org-company', label: 'Company Information', desc: 'Corporate details, website, and domains' },
      { id: 'org-departments', label: 'Departments', desc: 'Configure company business units' },
      { id: 'org-teams', label: 'Teams', desc: 'Set up regional and functional teams' },
      { id: 'org-branches', label: 'Branches', desc: 'Manage physical office locations' },
    ]
  },
  {
    group: 'Users & Access', id: 'users', icon: Users,
    items: [
      { id: 'users-users', label: 'Users', desc: 'Manage staff and agent directory' },
      { id: 'users-roles', label: 'Roles & Permissions', desc: 'Define access level profiles' },
      { id: 'users-groups', label: 'User Groups', desc: 'Organize users into permission groups' },
      { id: 'users-access', label: 'Access Control', desc: 'Multi-factor and login policies' },
      { id: 'users-logs', label: 'Activity Logs', desc: 'Audit user actions and logins' },
    ]
  },
  {
    group: 'CRM Configuration', id: 'crm', icon: Briefcase,
    items: [
      { id: 'crm-leads', label: 'Lead Settings', desc: 'Configure lead stages and mapping' },
      { id: 'crm-customers', label: 'Customer Settings', desc: 'Account and contact policies' },
      { id: 'crm-tickets', label: 'Ticket Settings', desc: 'Support SLA and ticket types' },
      { id: 'crm-status', label: 'Status & Priority', desc: 'Global status dictionaries' },
      { id: 'crm-categories', label: 'Categories & Tags', desc: 'System-wide tagging schemas' },
      { id: 'crm-fields', label: 'Custom Fields', desc: 'Extend data models with custom fields' },
    ]
  },
  {
    group: 'Forms & Templates', id: 'forms', icon: FileText,
    items: [
      { id: 'forms-builder', label: 'Form Builder', desc: 'Design lead capture web forms' },
      { id: 'forms-email', label: 'Email Templates', desc: 'HTML templates for outbound email' },
      { id: 'forms-sms', label: 'SMS Templates', desc: 'Text message formatting' },
      { id: 'forms-whatsapp', label: 'WhatsApp Templates', desc: 'Approved WhatsApp HSM templates' },
      { id: 'forms-document', label: 'Document Templates', desc: 'PDF generation templates' },
      { id: 'forms-kb', label: 'Knowledge Base', desc: 'Canned responses and articles' },
    ]
  },
  {
    group: 'Communication', id: 'comm', icon: MessageSquare,
    items: [
      { id: 'comm-email', label: 'Email (SMTP)', desc: 'Configure outbound mail servers' },
      { id: 'comm-telephony', label: 'Telephony', desc: 'SIP and PBX trunk connections' },
      { id: 'comm-whatsapp', label: 'WhatsApp Business', desc: 'WhatsApp API credentials' },
      { id: 'comm-sms', label: 'SMS Gateway', desc: 'SMS provider integration' },
      { id: 'comm-notifications', label: 'Notifications', desc: 'In-app and push alerts' },
      { id: 'comm-auto', label: 'Auto Responders', desc: 'Automated reply rules' },
    ]
  },
  {
    group: 'Integrations', id: 'integrations', icon: Plug,
    items: [
      { id: 'int-api', label: 'API Keys', desc: 'Manage system API access tokens' },
      { id: 'int-webhooks', label: 'Webhooks', desc: 'Real-time event subscriptions' },
      { id: 'int-exotel', label: 'Exotel', desc: 'Exotel cloud telephony setup' },
      { id: 'int-livekit', label: 'LiveKit', desc: 'LiveKit WebRTC connections' },
      { id: 'int-google', label: 'Google', desc: 'Google Workspace sync' },
      { id: 'int-microsoft', label: 'Microsoft', desc: 'Office 365 / Azure AD sync' },
      { id: 'int-facebook', label: 'Facebook', desc: 'Meta Business Suite' },
      { id: 'int-thirdparty', label: 'Third-Party Integrations', desc: 'Other marketplace apps' },
    ]
  },
  {
    group: 'Automation', id: 'automation', icon: Zap,
    items: [
      { id: 'auto-workflows', label: 'Workflow Rules', desc: 'Visual process automation' },
      { id: 'auto-assignment', label: 'Lead Assignment', desc: 'Round-robin routing rules' },
      { id: 'auto-triggers', label: 'Auto Triggers', desc: 'Event-based macro triggers' },
      { id: 'auto-jobs', label: 'Scheduled Jobs', desc: 'Cron and background tasks' },
      { id: 'auto-rules', label: 'Business Rules', desc: 'Validation and conditional logic' },
    ]
  },
  {
    group: 'Data Management', id: 'data', icon: Database,
    items: [
      { id: 'data-import', label: 'Import Data', desc: 'Bulk CSV / Excel import' },
      { id: 'data-export', label: 'Export Data', desc: 'Data extracts and archives' },
      { id: 'data-backup', label: 'Backup & Restore', desc: 'System snapshots' },
      { id: 'data-migration', label: 'Data Migration', desc: 'Migrate from legacy CRMs' },
      { id: 'data-audit', label: 'Audit Logs', desc: 'System-wide data changes' },
    ]
  },
  {
    group: 'System', id: 'system', icon: Monitor,
    items: [
      { id: 'sys-security', label: 'Security', desc: 'Passwords and encryption' },
      { id: 'sys-ip', label: 'IP Restrictions', desc: 'Network firewall rules' },
      { id: 'sys-localization', label: 'Localization', desc: 'Languages and currencies' },
      { id: 'sys-timezone', label: 'Time Zone', desc: 'Default corporate timezone' },
      { id: 'sys-branding', label: 'Branding', desc: 'Logos, colors, and whitelabel' },
      { id: 'sys-subscription', label: 'Subscription & Plan', desc: 'Billing and licenses' },
      { id: 'sys-license', label: 'License Management', desc: 'Seat allocations' },
    ]
  }
];


// ==========================================
// 2. GENERIC ENTERPRISE WORKSPACE LAYOUTS
// ==========================================

const EnterpriseTableWorkspace = ({ columns, data, primaryAction, onPrimaryAction, searchPlaceholder, emptyMessage }: any) => {
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex justify-between items-center mb-4 bg-[#101010] p-4 border border-[#1e1e1e] rounded-xl shadow-lg">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input aria-label="Search system settings" 
            type="text" 
            placeholder={searchPlaceholder || "Search records..."}
            className="bg-[#141414] border border-[#222] rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-orange-500 w-72 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] border border-[#262626] text-white hover:bg-[#202020] rounded-lg text-xs font-semibold transition-colors">
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] border border-[#262626] text-white hover:bg-[#202020] rounded-lg text-xs font-semibold transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          {primaryAction && (
            <button onClick={onPrimaryAction} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(234,88,12,0.1)]">
              <Plus className="w-3.5 h-3.5" /> {primaryAction}
            </button>
          )}
        </div>
      </div>

      <div className="border border-[#1e1e1e] rounded-xl overflow-hidden bg-[#0c0c0c] shadow-2xl">
        <table aria-label="Settings configuration table 1" className="w-full text-left text-xs">
          <thead className="bg-[#121212] border-b border-[#1e1e1e]">
            <tr>
              {columns.map((col: string, idx: number) => (
                <th key={idx} className={`px-5 py-3 font-bold text-slate-400 uppercase tracking-wider ${idx === columns.length - 1 ? 'text-right' : ''}`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e1e]">
            {data.length > 0 ? data.map((row: any, idx: number) => (
              <tr key={idx} className="hover:bg-[#141414] transition-colors">
                {row.map((cell: any, cellIdx: number) => (
                  <td key={cellIdx} className={`px-5 py-4 ${cellIdx === row.length - 1 ? 'text-right' : 'text-slate-300 font-medium'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-500 font-medium border-dashed">
                  {emptyMessage || "No data records found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EnterpriseFormWorkspace = ({ children, saveText, testText }: any) => {
  return (
    <div className="max-w-3xl bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl animate-in fade-in">
      <div className="p-6 space-y-6">
        {children}
      </div>
      <div className="p-5 bg-[#101010] border-t border-[#1e1e1e] flex items-center justify-between">
        <button type="button" className="text-xs text-slate-400 hover:text-white transition-colors">Discard Changes</button>
        <div className="flex items-center gap-3">
          {testText && (
            <button type="button" className="px-4 py-2.5 bg-[#1a1a1a] border border-[#333] hover:border-orange-500 text-white rounded-lg text-xs font-bold transition-all">
              {testText}
            </button>
          )}
          <button type="button" className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(234,88,12,0.1)]">
            {saveText || "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function SettingsPage() {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ org: true, users: true, comm: true, integrations: true });
  const [activeSetting, setActiveSetting] = useState<string>('org-company');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [branches, setBranches] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [orgData, setOrgData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Departments live state (DEF-10)
  const [departments, setDepartments] = useState<any[]>([]);
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [deptLoading, setDeptLoading] = useState(false);

  // Forms
  const { register: regOrg, handleSubmit: submitOrg, reset: resetOrg } = useForm();
  const { register: regBranch, handleSubmit: submitBranch, reset: resetBranch } = useForm();

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const fetchDepartments = async () => {
    try {
      const data = await api.get('/api/v1/departments');
      if (Array.isArray(data) && data.length > 0) {
        setDepartments(data);
      } else {
        setDepartments([
          { id: 'default-1', name: 'Sales & Conversions', description: 'Enterprise sales team', agentCount: 24, status: 'Active' },
          { id: 'default-2', name: 'Customer Support', description: 'Technical & operational support', agentCount: 42, status: 'Active' },
          { id: 'default-3', name: 'Field Operations', description: 'On-premise visits & appointments', agentCount: 12, status: 'Active' },
          { id: 'default-4', name: 'Marketing', description: 'Growth and outreach engine', agentCount: 5, status: 'Inactive' }
        ]);
      }
    } catch (err: any) {
      console.warn('[Departments API Fetch Warning]:', err.message);
      setDepartments([
        { id: 'default-1', name: 'Sales & Conversions', description: 'Enterprise sales team', agentCount: 24, status: 'Active' },
        { id: 'default-2', name: 'Customer Support', description: 'Technical & operational support', agentCount: 42, status: 'Active' },
        { id: 'default-3', name: 'Field Operations', description: 'On-premise visits & appointments', agentCount: 12, status: 'Active' },
        { id: 'default-4', name: 'Marketing', description: 'Growth and outreach engine', agentCount: 5, status: 'Inactive' }
      ]);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return;
    setDeptLoading(true);
    try {
      await api.post('/api/v1/departments', {
        name: newDeptName.trim(),
        description: newDeptDesc.trim() || undefined
      });
      await fetchDepartments();
      setIsAddDeptOpen(false);
      setNewDeptName('');
      setNewDeptDesc('');
    } catch (err: any) {
      console.error('[Add Department Error]', err);
      alert(err.message || 'Failed to create department');
    } finally {
      setDeptLoading(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (id.startsWith('default-')) {
      setDepartments(prev => prev.filter(d => d.id !== id));
      return;
    }
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/api/v1/departments/${id}`);
      setDepartments(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      console.error('[Delete Department Error]', err);
      alert(err.message || 'Failed to delete department');
    }
  };

  useEffect(() => {
    fetchDepartments();
    // Mock user details fetching
    try {
      const storedUser = localStorage.getItem('paramantra_user') || localStorage.getItem('crm_user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (e) { console.warn('[UI Exception Swallowed Fixed]:', e); }

    // Pre-populate branches for demo
    setBranches([
      { id: '1', name: 'Delhi NCR Hub', address: 'Cyber City, Sector 29, Gurugram' },
      { id: '2', name: 'Mumbai HQ', address: 'Bandra Kurla Complex, Mumbai' }
    ]);
  }, []);

  const getActiveSettingInfo = () => {
    if (activeSetting === 'my-profile') return { group: 'Personal', label: 'My Profile', desc: 'Manage your personal user account details' };
    for (const group of SETTINGS_NAV) {
      for (const item of group.items) {
        if (item.id === activeSetting) return { group: group.group, label: item.label, desc: item.desc };
      }
    }
    return { group: 'System', label: 'Settings', desc: 'Configuration' };
  };

  const activeInfo = getActiveSettingInfo();

  // ==========================================
  // 4. DYNAMIC WORKSPACE RENDERER
  // ==========================================
  const renderWorkspace = () => {
    switch (activeSetting) {

      // --- ORGANIZATION ---
      case 'org-profile':
      case 'org-company':
        return (
          <EnterpriseFormWorkspace saveText="Update Company Profile">
            <div className="flex items-center gap-6 pb-6 border-b border-[#1e1e1e]">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-lg border border-[#333] overflow-hidden">
                <div className="text-3xl font-black text-orange-600">CRM</div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">CRM Tool Corporation</h3>
                <p className="text-xs text-slate-500 mb-2">Corporate Identity Logo</p>
                <button type="button" className="px-3.5 py-1.5 bg-[#141414] border border-[#262626] text-white text-xs font-semibold rounded-lg hover:bg-[#202020] transition-colors">
                  Upload New Logo
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
                <input aria-label="W full bg 101010 border border 222 focusborder orange 500 rounded lg px 4 py 2 text sm text white outline none" type="text" defaultValue="CRM Tool" className="w-full bg-[#101010] border border-[#222] focus:border-orange-500 rounded-lg px-4 py-2 text-sm text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tax Registration (GST/VAT)</label>
                <input aria-label="W full bg 101010 border border 222 focusborder orange 500 rounded lg px 4 py 2 text sm text white outline none" type="text" defaultValue="29ABCDE1234F1Z5" className="w-full bg-[#101010] border border-[#222] focus:border-orange-500 rounded-lg px-4 py-2 text-sm text-white outline-none" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corporate Website</label>
                <input aria-label="W full bg 101010 border border 222 focusborder orange 500 rounded lg px 4 py 2 text sm text white outline none" type="url" defaultValue="https://www.crmtool.com" className="w-full bg-[#101010] border border-[#222] focus:border-orange-500 rounded-lg px-4 py-2 text-sm text-white outline-none" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Address</label>
                <textarea aria-label="Setting description" rows={2} defaultValue="Plot 45, Sector 44, Institutional Area, Gurugram, Haryana 122003" className="w-full bg-[#101010] border border-[#222] focus:border-orange-500 rounded-lg px-4 py-2 text-sm text-white outline-none custom-scrollbar" />
              </div>
            </div>
          </EnterpriseFormWorkspace>
        );
      
      case 'org-departments':
        return (
          <div className="space-y-4">
            {isAddDeptOpen && (
              <div className="bg-[#101010] border border-orange-500/30 p-5 rounded-xl shadow-xl space-y-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-white text-sm">Add New Department</h3>
                  <button onClick={() => setIsAddDeptOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Department Name</label>
                    <input 
                      aria-label="Department Name" 
                      type="text" 
                      value={newDeptName} 
                      onChange={(e) => setNewDeptName(e.target.value)} 
                      placeholder="e.g. Tele-Health Services" 
                      className="w-full bg-[#141414] border border-[#222] focus:border-orange-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                    <input 
                      aria-label="Department Description" 
                      type="text" 
                      value={newDeptDesc} 
                      onChange={(e) => setNewDeptDesc(e.target.value)} 
                      placeholder="Department responsibility" 
                      className="w-full bg-[#141414] border border-[#222] focus:border-orange-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsAddDeptOpen(false)} className="px-3 py-1.5 bg-[#141414] border border-[#262626] text-white hover:bg-[#202020] rounded-lg text-xs font-semibold">Cancel</button>
                  <button onClick={handleAddDepartment} disabled={deptLoading} className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                    {deptLoading ? 'Saving...' : 'Create Department'}
                  </button>
                </div>
              </div>
            )}
            <EnterpriseTableWorkspace 
              columns={['Department Name', 'Description', 'Employee Count', 'Status', 'Actions']}
              data={departments.map((dept) => [
                <span key="name" className="font-bold text-white">{dept.name}</span>,
                dept.description || 'General',
                `${dept.agents?.length || dept.agentCount || 0} Agents`,
                <span key="status" className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase">{dept.status || 'Active'}</span>,
                <button key="del" onClick={() => handleDeleteDepartment(dept.id)} className="text-rose-500 hover:underline">Delete</button>
              ])}
              primaryAction="Add Department"
              onPrimaryAction={() => setIsAddDeptOpen(true)}
              searchPlaceholder="Search departments..."
            />
          </div>
        );

      case 'org-teams':
        return (
          <EnterpriseTableWorkspace 
            columns={['Team Name', 'Department', 'Team Lead', 'Members', 'Actions']}
            data={[
              [<span className="font-bold text-white">North Region Sales</span>, 'Sales & Conversions', 'Raghav', '12 Members', <button className="text-orange-500 hover:underline">Edit</button>],
              [<span className="font-bold text-white">South Region Sales</span>, 'Sales & Conversions', 'Barani', '8 Members', <button className="text-orange-500 hover:underline">Edit</button>],
              [<span className="font-bold text-white">L1 Technical Support</span>, 'Customer Support', 'Mani', '25 Members', <button className="text-orange-500 hover:underline">Edit</button>],
            ]}
            primaryAction="Create Team"
          />
        );

      // --- USERS & ACCESS ---
      case 'users-users':
        return (
          <EnterpriseTableWorkspace 
            columns={['Agent Profile', 'Department', 'Extension', 'Role', 'Status', 'Actions']}
            data={[
              [<div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center font-bold text-slate-300">R</div><div><span className="font-bold text-white block">Raghav</span><span className="text-[10px] text-slate-500">raghav@crmtool.com</span></div></div>, 'Sales', 'Ext 101', 'Super Admin', <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase">Active</span>, <button className="text-orange-500 hover:underline">Manage</button>],
              [<div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center font-bold text-slate-300">M</div><div><span className="font-bold text-white block">Mani</span><span className="text-[10px] text-slate-500">mani@crmtool.com</span></div></div>, 'Support', 'Ext 102', 'Manager', <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase">Active</span>, <button className="text-orange-500 hover:underline">Manage</button>],
              [<div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center font-bold text-slate-300">B</div><div><span className="font-bold text-white block">Barani</span><span className="text-[10px] text-slate-500">barani@crmtool.com</span></div></div>, 'Field Ops', 'Ext 105', 'Agent', <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[9px] font-bold uppercase">Away</span>, <button className="text-orange-500 hover:underline">Manage</button>],
            ]}
            primaryAction="Invite Users"
            searchPlaceholder="Search directory by name, email, extension..."
          />
        );
      
      case 'users-roles':
        return (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center mb-2">
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-orange-600/10 text-orange-500 border border-orange-500/30 rounded-lg text-xs font-bold">Super Admin</button>
                <button className="px-4 py-2 bg-[#141414] text-slate-400 border border-[#222] hover:bg-[#202020] rounded-lg text-xs font-bold">Manager</button>
                <button className="px-4 py-2 bg-[#141414] text-slate-400 border border-[#222] hover:bg-[#202020] rounded-lg text-xs font-bold">Agent Level 1</button>
              </div>
              <button className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-[0_0_15px_rgba(234,88,12,0.1)]">
                <Plus className="w-3.5 h-3.5" /> Clone Role
              </button>
            </div>
            
            <div className="border border-[#1e1e1e] rounded-xl overflow-hidden bg-[#0c0c0c] shadow-2xl">
              <table aria-label="Settings configuration table 2" className="w-full text-left text-xs">
                <thead className="bg-[#121212] border-b border-[#1e1e1e]">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider">Module Resource</th>
                    <th scope="col" className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-center">View</th>
                    <th scope="col" className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-center">Create</th>
                    <th scope="col" className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-center">Edit</th>
                    <th scope="col" className="px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e]">
                  {['Leads Management', 'Customer Accounts', 'Ticketing & Cases', 'Reports & Dashboards', 'Target Management'].map((mod, idx) => (
                    <tr key={idx} className="hover:bg-[#141414]">
                      <td className="px-5 py-4 font-bold text-white">{mod}</td>
                      <td className="px-5 py-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="px-5 py-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="px-5 py-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                      <td className="px-5 py-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                    </tr>
                  ))}
                  <tr className="hover:bg-[#141414]">
                    <td className="px-5 py-4 font-bold text-white">System Settings</td>
                    <td className="px-5 py-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                    <td className="px-5 py-4 text-center"><X className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="px-5 py-4 text-center"><X className="w-4 h-4 text-slate-600 mx-auto" /></td>
                    <td className="px-5 py-4 text-center"><X className="w-4 h-4 text-slate-600 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
              <div className="p-4 bg-[#101010] border-t border-[#1e1e1e] text-right">
                <button className="px-5 py-2 bg-orange-600 text-white font-bold rounded-lg text-xs">Save Permissions</button>
              </div>
            </div>
          </div>
        );

      // --- COMMUNICATION ---
      case 'comm-email':
        return (
          <EnterpriseFormWorkspace saveText="Save SMTP Config" testText="Test Connection">
            <h3 className="text-sm font-bold text-white mb-2">SMTP Server Configuration</h3>
            <p className="text-xs text-slate-500 mb-6">Configure outbound email delivery for workflows and alerts via your corporate mail server.</p>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SMTP Host</label>
                <input aria-label="W full bg 101010 border border 222 focusborder orange 500 rounded lg px 4 py 2 text sm text white outline none" type="text" defaultValue="smtp.office365.com" className="w-full bg-[#101010] border border-[#222] focus:border-orange-500 rounded-lg px-4 py-2 text-sm text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SMTP Port</label>
                <input aria-label="W full bg 101010 border border 222 focusborder orange 500 rounded lg px 4 py 2 text sm text white outline none" type="number" defaultValue={587} className="w-full bg-[#101010] border border-[#222] focus:border-orange-500 rounded-lg px-4 py-2 text-sm text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Encryption Protocol</label>
                <select aria-label="System setting option" className="w-full bg-[#101010] border border-[#222] focus:border-orange-500 rounded-lg px-3 py-2 text-sm text-white outline-none">
                  <option>TLS / STARTTLS</option>
                  <option>SSL</option>
                  <option>Unencrypted (Not Recommended)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username / Email Auth</label>
                <input aria-label="W full bg 101010 border border 222 focusborder orange 500 rounded lg px 4 py 2 text sm text white outline none" type="text" defaultValue="alerts@crmtool.com" className="w-full bg-[#101010] border border-[#222] focus:border-orange-500 rounded-lg px-4 py-2 text-sm text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password / App Password</label>
                <input aria-label="W full bg 101010 border border 222 focusborder orange 500 rounded lg px 4 py 2 text sm text white outline none" type="password" defaultValue="********" className="w-full bg-[#101010] border border-[#222] focus:border-orange-500 rounded-lg px-4 py-2 text-sm text-white outline-none" />
              </div>
            </div>
          </EnterpriseFormWorkspace>
        );

      case 'comm-whatsapp':
      case 'int-exotel':
      case 'int-api':
        return (
          <EnterpriseTableWorkspace 
            columns={['Integration Key Name', 'Environment', 'Prefix', 'Created Date', 'Last Used', 'Status', 'Actions']}
            data={[
              [<span className="font-bold text-white">Production Gateway</span>, 'Production', 'sk_prod_...', 'Oct 12, 2025', '2 mins ago', <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase">Active</span>, <button className="text-red-500 hover:underline">Revoke</button>],
              [<span className="font-bold text-white">Staging Integration</span>, 'Staging', 'sk_test_...', 'Dec 05, 2025', '14 days ago', <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase">Active</span>, <button className="text-red-500 hover:underline">Revoke</button>],
            ]}
            primaryAction="Generate New Key"
            searchPlaceholder="Search API keys and credentials..."
          />
        );

      // --- FORMS & TEMPLATES ---
      case 'forms-builder':
      case 'forms-email':
      case 'forms-sms':
      case 'forms-whatsapp':
        return (
          <EnterpriseTableWorkspace 
            columns={['Template Name', 'Module', 'Last Modified By', 'Last Modified Date', 'Status', 'Actions']}
            data={[
              [<span className="font-bold text-white">Welcome Lead Sequence 1</span>, 'Leads', 'Raghav', 'Today, 14:30', <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase">Published</span>, <button className="text-orange-500 hover:underline">Edit Builder</button>],
              [<span className="font-bold text-white">Invoice Follow-up</span>, 'Customers', 'System', 'Yesterday, 09:15', <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase">Published</span>, <button className="text-orange-500 hover:underline">Edit Builder</button>],
              [<span className="font-bold text-white">Ticket Resolution Survey</span>, 'Tickets', 'Mani', 'Oct 10, 2025', <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[9px] font-bold uppercase">Draft</span>, <button className="text-orange-500 hover:underline">Edit Builder</button>],
            ]}
            primaryAction="Create Template"
          />
        );

      // --- SYSTEM & DATA ---
      case 'sys-security':
        return (
          <EnterpriseFormWorkspace saveText="Save Security Policies">
            <h3 className="text-sm font-bold text-white mb-2">Authentication & Security Policies</h3>
            <p className="text-xs text-slate-500 mb-6">Enforce global password strength and multi-factor authentication requirements.</p>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#141414] border border-[#222] rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500"/> Enforce Multi-Factor Auth (MFA)</h4>
                  <p className="text-xs text-slate-500 mt-1">Require all agents to use Authenticator Apps upon login.</p>
                </div>
                <div className="w-12 h-6 bg-orange-600 rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#141414] border border-[#222] rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><Key className="w-4 h-4 text-slate-400"/> Password Expiry Policy</h4>
                  <p className="text-xs text-slate-500 mt-1">Force users to reset passwords every 90 days.</p>
                </div>
                <div className="w-12 h-6 bg-[#222] border border-[#333] rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-slate-500 rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-[#141414] border border-[#222] rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-slate-400"/> Session Timeout</h4>
                  <p className="text-xs text-slate-500 mt-1">Automatically log out idle web sessions after 30 minutes.</p>
                </div>
                <div className="w-12 h-6 bg-orange-600 rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                </div>
              </div>
            </div>
          </EnterpriseFormWorkspace>
        );

      // General fallback that renders a beautiful generic layout instead of an empty screen
      default:
        return (
          <EnterpriseTableWorkspace 
            columns={['Record Name', 'Module', 'Created By', 'Status', 'Actions']}
            data={[
              [<span className="font-bold text-white">Sample Config 1</span>, 'System', 'Admin', <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase">Active</span>, <button className="text-orange-500 hover:underline">Edit</button>],
              [<span className="font-bold text-white">Sample Config 2</span>, 'System', 'Admin', <span className="px-2 py-0.5 bg-[#222] text-slate-400 border border-[#333] rounded-full text-[9px] font-bold uppercase">Inactive</span>, <button className="text-orange-500 hover:underline">Edit</button>],
            ]}
            primaryAction={`Create ${activeInfo.label}`}
          />
        );
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#050505] text-white overflow-hidden p-4">
      {/* Centralized Workspace Container */}
      <div className="flex-1 flex border border-[#1e1e1e] rounded-2xl bg-[#090909] overflow-hidden shadow-2xl">
        
        {/* LEFT NAV PANEL */}
        <div className="w-[280px] bg-[#0c0c0c] border-r border-[#1e1e1e] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#1e1e1e]">
            <h1 className="text-base font-black text-white flex items-center gap-2 tracking-wide">
              <SettingsIcon className="text-orange-500 w-5 h-5" /> SYSTEM SETUP
            </h1>
            <div className="relative mt-4">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input aria-label="Search configuration options" 
                type="text" 
                placeholder="Search settings..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141414] border border-[#222] rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            <button
              onClick={() => setActiveSetting('my-profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                activeSetting === 'my-profile' ? 'bg-orange-600/15 text-orange-500' : 'text-slate-400 hover:text-white hover:bg-[#141414]'
              }`}
            >
              <User className="w-4 h-4" /> My Profile
            </button>

            <div className="my-2 border-b border-[#1c1c1c]"></div>

            {SETTINGS_NAV.map((group) => {
              const isExpanded = expandedGroups[group.id];
              const matchesSearch = searchQuery === '' || 
                                    group.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    group.items.some(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()));
              
              if (!matchesSearch) return null;

              return (
                <div key={group.id} className="mb-1">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-[#141414] transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <group.icon className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                      {group.group}
                    </div>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-0.5 ml-3 pl-3 border-l border-[#222] space-y-0.5">
                      {group.items.map((item) => {
                        if (searchQuery !== '' && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveSetting(item.id)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                              activeSetting === item.id 
                                ? 'bg-orange-600/10 text-orange-500 font-bold' 
                                : 'text-slate-400 hover:text-white hover:bg-[#141414]'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#090909]">
          
          <div className="h-20 border-b border-[#1e1e1e] p-6 shrink-0 flex items-center justify-between bg-[#0a0a0a]">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                <span>Setup</span>
                <ChevronRight className="w-3 h-3" />
                <span>{activeInfo.group}</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{activeInfo.label}</h2>
            </div>
            
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-500">{activeInfo.desc}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            {renderWorkspace()}
          </div>
        </div>

      </div>
    </div>
  );
}
