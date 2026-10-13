import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  RefreshCw, 
  Building2, 
  Users, 
  GraduationCap, 
  MapPin, 
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Layers,
  Sparkles,
  HeartPulse,
  Briefcase,
  ShieldAlert,
  UserCheck,
  Anchor,
  Landmark,
  Accessibility,
  BookOpen,
  Search,
  Filter,
  FileText
} from 'lucide-react';
import { SPREADSHEET_ID, MONTH_TABS, processSheetCSV } from './sheetData';

// The 10 specific slicers required
const SLICERS = [
  'Common Dashboard',
  'Division',
  'Health Department',
  'Labour Department',
  'DCPO',
  'Social Welfare',
  'Fisheries Department',
  'Revenue Department',
  'DDRO',
  'DSE'
] as const;

type SlicerType = typeof SLICERS[number];

// Vibrant department configuration for colorful semi-light theme
const DEPT_META: Record<string, { icon: React.ElementType; color: string; badge: string; bg: string }> = {
  'Common Dashboard': { icon: Layers, color: '#2563eb', badge: 'bg-blue-500/15 text-blue-700', bg: 'from-blue-600 to-indigo-600' },
  'Division': { icon: Building2, color: '#0d9488', badge: 'bg-teal-500/15 text-teal-700', bg: 'from-teal-600 to-emerald-600' },
  'Health Department': { icon: HeartPulse, color: '#059669', badge: 'bg-emerald-500/15 text-emerald-700', bg: 'from-emerald-500 to-teal-600' },
  'Labour Department': { icon: Briefcase, color: '#d97706', badge: 'bg-amber-500/15 text-amber-700', bg: 'from-amber-500 to-orange-600' },
  'DCPO': { icon: ShieldAlert, color: '#4f46e5', badge: 'bg-indigo-500/15 text-indigo-700', bg: 'from-indigo-600 to-blue-700' },
  'Social Welfare': { icon: UserCheck, color: '#db2777', badge: 'bg-pink-500/15 text-pink-700', bg: 'from-pink-600 to-rose-600' },
  'Fisheries Department': { icon: Anchor, color: '#0284c7', badge: 'bg-sky-500/15 text-sky-700', bg: 'from-sky-500 to-cyan-600' },
  'Revenue Department': { icon: Landmark, color: '#0f766e', badge: 'bg-teal-500/15 text-teal-700', bg: 'from-teal-600 to-slate-700' },
  'DDRO': { icon: Accessibility, color: '#7c3aed', badge: 'bg-purple-500/15 text-purple-700', bg: 'from-purple-600 to-violet-700' },
  'DSE': { icon: BookOpen, color: '#2563eb', badge: 'bg-blue-500/15 text-blue-700', bg: 'from-blue-600 to-indigo-600' },
};

// Rich vibrant palette for the Class-Wise Donut Pie Chart
const PIE_COLORS = [
  '#3b82f6', '#06b6d4', '#10b981', '#84cc16', 
  '#eab308', '#f97316', '#ef4444', '#ec4899', 
  '#d946ef', '#8b5cf6', '#6366f1', '#14b8a6'
];

export default function App() {
  const [selectedSlicer, setSelectedSlicer] = useState<SlicerType>('Common Dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('Sep 26');
  const [deptSearch, setDeptSearch] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (isManualRefresh = false, monthToFetch = selectedMonth) => {
    if (isManualRefresh) setRefreshing(true);
    setError(null);
    try {
      let fetchedData = null;

      // 1. Try server endpoint first (/api/data or Vercel serverless /api/data)
      try {
        const endpoint = isManualRefresh ? '/api/refresh' : '/api/data';
        const url = `${endpoint}?month=${encodeURIComponent(monthToFetch)}`;
        const res = await fetch(url, {
          method: isManualRefresh ? 'POST' : 'GET',
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await res.json();
            if (json && json.data) {
              fetchedData = json.data;
            }
          }
        }
      } catch (apiErr) {
        console.warn('API endpoint unavailable, falling back to direct Google Sheet connection:', apiErr);
      }

      // 2. If API was not available or gave an error (e.g. running on Vercel without express),
      // fetch directly from Google Sheets published/public gviz CSV export!
      if (!fetchedData) {
        const targetGid = MONTH_TABS[monthToFetch] || MONTH_TABS['Sep 26'];
        const directUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${targetGid}`;
        const sheetRes = await fetch(directUrl);
        if (!sheetRes.ok) {
          throw new Error(`Google Sheet returned HTTP ${sheetRes.status} for sheet "${monthToFetch}".`);
        }
        const csvText = await sheetRes.text();
        fetchedData = processSheetCSV(csvText, monthToFetch);
      }

      setData(fetchedData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Unable to connect to Google Sheet.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, []);

  const formatLastSync = (iso: string) => {
    if (!iso) return 'Just now';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl border border-white shadow-3d-lg max-w-sm w-full text-center space-y-4 animate-float">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-400 text-white flex items-center justify-center mx-auto shadow-md">
            <RefreshCw className="w-7 h-7 animate-spin" />
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Connecting to Live Dashboard
          </h2>
          <p className="text-xs text-slate-500">
            Fetching verified dropout records from Thoothukudi District sheet...
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-3d max-w-md w-full text-center space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            Connection Error
          </h2>
          <p className="text-xs text-slate-600">{error}</p>
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => fetchData(true)}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 shadow-3d"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const summary = data?.summary || { potentialDropout: 0, readmitted: 0, migrated: 0, repeaters: 0 };
  const charts = {
    blockWise: (data?.charts?.blockWise || data?.blockData || []) as Array<{ name: string; count: number }>,
    lineDepartment: (data?.charts?.lineDepartment || data?.lineDepartmentData || []) as Array<{ name: string; count: number; fullName?: string }>,
    classWise: (data?.charts?.classWise || data?.classData || []) as Array<{ name: string; value: number; count?: number; sortOrder?: number }>,
  };
  const departments = (data?.departments || []) as any[];
  const divisions = (data?.divisions || []) as any[];

  // Custom 3D Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-xl border border-slate-700/80 shadow-2xl text-xs">
          <div className="font-semibold text-slate-200">{label || payload[0].name}</div>
          <div className="font-mono font-bold text-teal-300 text-sm mt-0.5">
            {payload[0].value} Students
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/30 text-slate-800 flex flex-col font-sans">
      
      {/* SVG Gradients for 3D Bar Highlights */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="barGradientBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.95} />
          </linearGradient>
          <linearGradient id="barGradientTeal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity={1} />
            <stop offset="100%" stopColor="#0f766e" stopOpacity={0.95} />
          </linearGradient>
          <linearGradient id="barGradientPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
            <stop offset="100%" stopColor="#6b21a8" stopOpacity={0.95} />
          </linearGradient>
          <filter id="shadow3D" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.15" />
          </filter>
        </defs>
      </svg>

      {/* Header with 3D Depth Styling */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-3d-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Title and Tamil Nadu Emblem Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 text-teal-400 flex items-center justify-center shrink-0 shadow-3d border border-slate-700/60 card-3d">
              <Building2 className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                  Monthly Potential Dropout Dashboard
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-xs">
                  Thoothukudi District
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                District Administration <span className="text-slate-300">|</span> School Education & Skill Development
              </p>
            </div>
          </div>

          {/* Right Header Controls: Month Filter + 3D Refresh Button */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* Month Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-3d-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Month:
              </span>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => {
                  const newMonth = e.target.value;
                  setSelectedMonth(newMonth);
                  fetchData(false, newMonth);
                }}
                className="py-0.5 pl-1 pr-6 text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                title="Select month sheet tab"
              >
                {(data?.availableMonths || ['Sep 26', 'Oct 26', 'Nov 26']).map((m: string) => (
                  <option key={m} value={m} className="font-semibold text-slate-800">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* 3D Action Refresh Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-3d transition-all active:translate-y-0.5 ${
                refreshing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-slate-800 hover:to-indigo-900 text-white border border-slate-700/60 hover:shadow-3d-lg'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-400' : 'text-teal-300'}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <span className="text-[11px] font-medium text-slate-400 hidden lg:inline">
              Synced: {formatLastSync(data?.lastRefreshedAt)}
            </span>
          </div>

        </div>
      </header>

      {/* Main Layout: 3D Left Sidebar Slicers + Dynamic Workspace */}
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col md:flex-row p-4 sm:p-6 gap-6">
        
        {/* Left Sidebar — 10 Slicers in Single-Column Grid */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-3.5 shadow-3d sticky top-20">
            <div className="px-2.5 py-1.5 mb-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                10 Dashboard Slicers
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {selectedMonth}
              </span>
            </div>

            <nav className="grid grid-cols-1 gap-1.5">
              {SLICERS.map((slicer) => {
                const isSelected = selectedSlicer === slicer;
                const meta = DEPT_META[slicer] || DEPT_META['Common Dashboard'];
                const IconComponent = meta.icon;

                return (
                  <button
                    key={slicer}
                    onClick={() => setSelectedSlicer(slicer)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all duration-200 card-3d ${
                      isSelected
                        ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-3d-lg border border-slate-700/80 -translate-y-0.5 ring-2 ring-teal-500/30'
                        : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/70 hover:border-slate-300 shadow-2xs hover:shadow-3d-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-white/15 text-teal-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="tracking-tight">{slicer}</span>
                    </div>

                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isSelected ? 'text-teal-400 translate-x-0.5' : 'text-slate-400 opacity-50'
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Dashboard Area */}
        <main className="flex-1 min-w-0">
          
          {/* ======================================================== */}
          {/* 1. COMMON DASHBOARD VIEW */}
          {/* ======================================================== */}
          {selectedSlicer === 'Common Dashboard' && (
            <div className="space-y-6">
              
              {/* Top Row — 4 Prominent 3D Summary Cards in One Horizontal Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Box 1: Potential Dropout — Royal Blue Gradient */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-3d card-3d">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                      Potential Dropout
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-blue-950 mt-3 font-mono tracking-tight">
                    {summary.potentialDropout}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-blue-700/80 font-medium pt-2 border-t border-blue-100">
                    <span>Identified Students</span>
                    <span className="font-bold text-blue-900">100% Caseload</span>
                  </div>
                </div>

                {/* Box 2: Readmitted — Vibrant Emerald Green Gradient */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-3d card-3d">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                      Readmitted
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-950 mt-3 font-mono tracking-tight">
                    {summary.readmitted}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-700/80 font-medium pt-2 border-t border-emerald-100">
                    <span>Re-enrolled in School</span>
                    <span className="font-bold text-emerald-900">Resolved</span>
                  </div>
                </div>

                {/* Box 3: Migrated — Sunset Amber Gradient */}
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-3d card-3d">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                      Migrated
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md">
                      <MapPin className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-amber-950 mt-3 font-mono tracking-tight">
                    {summary.migrated}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-amber-700/80 font-medium pt-2 border-t border-amber-100">
                    <span>Relocated District/Block</span>
                    <span className="font-bold text-amber-900">Tracked</span>
                  </div>
                </div>

                {/* Box 4: Repeaters — Royal Amethyst Purple Gradient */}
                <div className="relative overflow-hidden bg-gradient-to-br from-purple-50/90 via-violet-50/40 to-white border border-purple-200/80 rounded-2xl p-4 sm:p-5 shadow-3d card-3d">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                      Repeaters
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-violet-600 text-white flex items-center justify-center shadow-md">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-purple-950 mt-3 font-mono tracking-tight">
                    {summary.repeaters}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-purple-700/80 font-medium pt-2 border-t border-purple-100">
                    <span>Repeater or Not Column</span>
                    <span className="font-bold text-purple-900">
                      {summary.potentialDropout > 0 ? ((summary.repeaters / summary.potentialDropout) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>

              </div>

              {/* Middle Section — Two 3D Bar Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Bar Chart 1: Block-Wise Potential Dropout */}
                <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-3d card-3d">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                        Block-Wise Potential Dropout
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      13 Blocks
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3 font-medium">
                    Total potential dropout student counts per block for {selectedMonth}
                  </p>
                  
                  <div className="h-64 sm:h-72 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={charts.blockWise}
                        margin={{ top: 22, right: 10, left: -20, bottom: 42 }}
                      >
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }}
                          interval={0}
                          angle={-35}
                          textAnchor="end"
                          height={50}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#64748b"
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.6 }} />
                        <Bar
                          dataKey="count"
                          fill="url(#barGradientBlue)"
                          radius={[6, 6, 0, 0]}
                          filter="url(#shadow3D)"
                          label={{ position: 'top', fill: '#1e3a8a', fontSize: 11, fontWeight: 800 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar Chart 2: Line Department */}
                <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-3d card-3d">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-600"></div>
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                        Line Department
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      8 Line Departments
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3 font-medium">
                    Department-wise student intervention counts
                  </p>
                  
                  <div className="h-64 sm:h-72 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={charts.lineDepartment}
                        margin={{ top: 22, right: 10, left: -20, bottom: 42 }}
                      >
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }}
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={50}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#64748b"
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.6 }} />
                        <Bar
                          dataKey="count"
                          fill="url(#barGradientTeal)"
                          radius={[6, 6, 0, 0]}
                          filter="url(#shadow3D)"
                          label={{ position: 'top', fill: '#0f766e', fontSize: 11, fontWeight: 800 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Bottom Section — Class-Wise Potential Dropout Bar Chart */}
              <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-3d card-3d">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div>
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      Class-Wise Potential Dropout
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                    Class 1 through Class 12
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3 font-medium">
                  Distribution of potential dropout students across classes
                </p>

                <div className="h-64 sm:h-72 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={charts.classWise}
                      margin={{ top: 22, right: 10, left: -20, bottom: 25 }}
                    >
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={40}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.6 }} />
                      <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        filter="url(#shadow3D)"
                        label={{ position: 'top', fill: '#4f46e5', fontSize: 11, fontWeight: 800 }}
                      >
                        {(charts.classWise || []).map((_entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* 2. DIVISION SLICER VIEW */}
          {/* ======================================================== */}
          {selectedSlicer === 'Division' && (
            <div className="space-y-5">
              <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-3d card-3d">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Division-Wise Potential Dropout Breakdown
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Educational division distribution across Thoothukudi District for {selectedMonth}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    3 Educational Divisions
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {divisions.map((div: any, idx: number) => {
                  const gradient = idx === 0 
                    ? 'from-blue-600 to-indigo-700' 
                    : idx === 1 
                    ? 'from-teal-600 to-emerald-700' 
                    : 'from-purple-600 to-violet-700';

                  return (
                    <div
                      key={div.division}
                      className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-3d card-3d flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <span className="text-xs font-extrabold text-slate-900">{div.division}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold text-white bg-gradient-to-r ${gradient} shadow-sm`}>
                            {div.total} Students
                          </span>
                        </div>

                        <div className="mt-3 text-xs text-slate-600 flex justify-between bg-slate-50 p-2 rounded-xl">
                          <span className="font-medium">Repeaters in Division:</span>
                          <span className="font-mono font-bold text-purple-700">{div.repeaters}</span>
                        </div>

                        <div className="mt-4 space-y-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Blocks & Student Counts
                          </span>
                          {div.blocks.map((b: any) => (
                            <div key={b.name} className="flex justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
                              <span className="font-medium">{b.name}</span>
                              <span className="font-mono font-bold text-slate-900">{b.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-right">
                        Field Supervision Assigned
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. DEPARTMENT SLICER VIEWS */}
          {/* ======================================================== */}
          {selectedSlicer !== 'Common Dashboard' && selectedSlicer !== 'Division' && (
            <div className="space-y-5">
              
              {/* Department Overview Banner */}
              <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-5 sm:p-6 shadow-3d card-3d">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const meta = DEPT_META[selectedSlicer] || DEPT_META['Common Dashboard'];
                      const IconComponent = meta.icon;
                      return (
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${meta.bg} text-white flex items-center justify-center shadow-md`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                      );
                    })()}
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                        {selectedSlicer} Dashboard
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Intervention & Follow-up Tracking for {selectedMonth}
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-auto">
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-3d">
                      <span>Assigned Cases:</span>
                      <span className="font-mono text-teal-300 font-extrabold text-sm">
                        {departments.find((d: any) => d.name === selectedSlicer)?.count || 0}
                      </span>
                    </span>
                  </div>
                </div>

                {/* District Collector's Directive from Category Reference */}
                <div className="mt-4 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs text-slate-700 shadow-3d-inner">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    District Administration Directive (Category Reference)
                  </div>
                  <p className="leading-relaxed font-medium text-slate-800">
                    {departments.find((d: any) => d.name === selectedSlicer)?.guideline ||
                      'Field verification and departmental action in progress.'}
                  </p>
                </div>
              </div>

              {/* Department Specific 3D Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-4 sm:p-5 shadow-3d card-3d">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Department Caseload
                  </span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                    {departments.find((d: any) => d.name === selectedSlicer)?.count || 0}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Directly Mapped from EMIS
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-4 sm:p-5 shadow-3d card-3d">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    District Total Tracked
                  </span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                    {summary.potentialDropout}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Across All 13 Blocks
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-4 sm:p-5 shadow-3d card-3d">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Verification Pipeline
                  </span>
                  <div className="text-sm font-extrabold text-emerald-700 mt-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Active Field Follow-up</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    BRTE 10-day monitoring window
                  </div>
                </div>
              </div>

              {/* Department Coordination Details */}
              <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-3d card-3d">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-teal-600" />
                  Line Department Coordination Protocol
                </h3>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    Student records mapped to <strong>{selectedSlicer}</strong> are verified through BRC-level field visits following download from the EMIS portal on the 1st of every month.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Live updates to the <em>Line Department</em> column in Google Sheet tab <strong>"{selectedMonth}"</strong> will immediately reflect in this dashboard upon clicking the <strong>Refresh</strong> button.
                  </p>
                </div>
              </div>

              {/* Assigned Student Records or Block Outreach Directory */}
              {(() => {
                const currentDept = departments.find((d: any) => d.name === selectedSlicer);
                const deptStudents: any[] = currentDept?.students || [];
                const filteredStudents = deptStudents.filter((s: any) => 
                  !deptSearch || 
                  s.studentName.toLowerCase().includes(deptSearch.toLowerCase()) ||
                  s.block.toLowerCase().includes(deptSearch.toLowerCase()) ||
                  s.school.toLowerCase().includes(deptSearch.toLowerCase()) ||
                  (s.emisId && s.emisId.includes(deptSearch))
                );

                if (deptStudents.length > 0) {
                  return (
                    <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-3d card-3d space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span>Assigned Student Records ({deptStudents.length})</span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            Verified cases requiring {selectedSlicer} follow-up in {selectedMonth}
                          </p>
                        </div>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Filter by name, block, EMIS..."
                            value={deptSearch}
                            onChange={(e) => setDeptSearch(e.target.value)}
                            className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 w-full sm:w-56"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/80">
                            <tr>
                              <th className="py-2.5 px-3">S.No</th>
                              <th className="py-2.5 px-3">Student Name</th>
                              <th className="py-2.5 px-3">EMIS ID</th>
                              <th className="py-2.5 px-3">Class</th>
                              <th className="py-2.5 px-3">School</th>
                              <th className="py-2.5 px-3">Block</th>
                              <th className="py-2.5 px-3">Repeater</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {filteredStudents.map((st: any, idx: number) => (
                              <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{st.sNo}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{st.studentName}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{st.emisId || '-'}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 text-[11px]">
                                    Std {st.std} {st.sec ? `(${st.sec})` : ''}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs truncate">{st.school}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{st.block}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    st.repeaterStatus?.toLowerCase() === 'repeater'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {st.repeaterStatus}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    {st.status || 'Active Verification'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-3d card-3d space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-teal-600" />
                          <span>Block-Wise Target Outreach Pool ({selectedMonth})</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Potential dropouts awaiting line-department assignment across 13 blocks
                        </p>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        13 Blocks
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {(charts.blockWise || []).map((b: any) => (
                        <div
                          key={b.name}
                          className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between hover:bg-white hover:shadow-3d-sm transition-all"
                        >
                          <span className="text-xs font-semibold text-slate-700 truncate pr-1">{b.name}</span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-900 shadow-2xs">
                            {b.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

        </main>
      </div>

    </div>
  );
}
