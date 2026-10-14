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
  FileSpreadsheet,
  FileText,
  Calendar,
  AlertCircle,
  HelpCircle,
  Check,
  ArrowRight
} from 'lucide-react';
import { SPREADSHEET_ID, MONTH_TABS, processSheetCSV, StudentRecord, DepartmentAbstract } from './sheetData';
import { Background3D } from './components/Background3D';
import { exportStudentsToExcel, exportStudentsToWord, exportStudentsToDocs, exportAbstractToExcel } from './exportUtils';

// Slicers with "All Line Department" positioned right before Health Department
const SLICERS = [
  'Common Dashboard',
  'Division',
  'All Line Department',
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

// Classic styling configuration for departments
const DEPT_META: Record<string, { icon: React.ElementType; color: string; badge: string; bg: string }> = {
  'Common Dashboard': { icon: Layers, color: '#1e3a5f', badge: 'bg-slate-100 text-slate-800', bg: 'from-slate-800 to-slate-900' },
  'Division': { icon: Building2, color: '#0f766e', badge: 'bg-teal-50 text-teal-800', bg: 'from-teal-800 to-slate-900' },
  'All Line Department': { icon: Layers, color: '#1e3a8a', badge: 'bg-blue-50 text-blue-800', bg: 'from-blue-900 to-indigo-950' },
  'Health Department': { icon: HeartPulse, color: '#047857', badge: 'bg-emerald-50 text-emerald-800', bg: 'from-emerald-800 to-teal-950' },
  'Labour Department': { icon: Briefcase, color: '#b45309', badge: 'bg-amber-50 text-amber-800', bg: 'from-amber-800 to-yellow-950' },
  'DCPO': { icon: ShieldAlert, color: '#4338ca', badge: 'bg-indigo-50 text-indigo-800', bg: 'from-indigo-900 to-slate-900' },
  'Social Welfare': { icon: UserCheck, color: '#9d174d', badge: 'bg-pink-50 text-pink-800', bg: 'from-pink-900 to-rose-950' },
  'Fisheries Department': { icon: Anchor, color: '#0369a1', badge: 'bg-sky-50 text-sky-800', bg: 'from-sky-900 to-cyan-950' },
  'Revenue Department': { icon: Landmark, color: '#0f766e', badge: 'bg-teal-50 text-teal-800', bg: 'from-teal-900 to-slate-950' },
  'DDRO': { icon: Accessibility, color: '#6d28d9', badge: 'bg-purple-50 text-purple-800', bg: 'from-purple-900 to-violet-950' },
  'DSE': { icon: BookOpen, color: '#1d4ed8', badge: 'bg-blue-50 text-blue-800', bg: 'from-blue-900 to-slate-900' },
};

// Classic administrative chart palette
const CLASSIC_CHART_COLORS = [
  '#1e3a5f', '#047857', '#b45309', '#4338ca', 
  '#9d174d', '#0369a1', '#0f766e', '#6d28d9', 
  '#1d4ed8', '#475569', '#334155', '#1e293b'
];

// Standard present status dropdown options for department officials
const PRESENT_STATUS_OPTIONS = [
  'Status Not Updated',
  'Re-enrolled',
  'Counselling in Progress',
  'Willing to Rejoin',
  'Not Willing to Rejoin',
  'Migrated',
  'Transferred',
  'Contacted - Follow Up',
  'Open - Pending Verification'
];

export default function App() {
  const [selectedSlicer, setSelectedSlicer] = useState<SlicerType>('Common Dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('Sep 2026');
  const [deptSearch, setDeptSearch] = useState<string>('');
  const [divisionFilter, setDivisionFilter] = useState<string>('All');
  const [divisionSearch, setDivisionSearch] = useState<string>('');
  const [revenueTalukFilter, setRevenueTalukFilter] = useState<string>('All');
  const [revenueSearch, setRevenueSearch] = useState<string>('');
  const [abstractSearch, setAbstractSearch] = useState<string>('');
  
  // Department-edited status state (keyed by student EMIS or sNo)
  const [editedStatuses, setEditedStatuses] = useState<Record<string, string>>({});
  const [statusSaveNotice, setStatusSaveNotice] = useState<string | null>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved status edits from localStorage on mount/month change
  useEffect(() => {
    try {
      const storageKey = `thoothukudi_status_edits_${selectedMonth}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setEditedStatuses(JSON.parse(saved));
      } else {
        setEditedStatuses({});
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [selectedMonth]);

  const fetchData = async (isManualRefresh = false, monthToFetch = selectedMonth) => {
    if (isManualRefresh) setRefreshing(true);
    setError(null);
    try {
      let fetchedData = null;

      // 1. Try server endpoint first
      try {
        const endpoint = isManualRefresh ? '/api/refresh' : '/api/data';
        const url = `${endpoint}?month=${encodeURIComponent(monthToFetch)}`;
        const res = await fetch(url, { method: isManualRefresh ? 'POST' : 'GET' });
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
        console.warn('API endpoint unavailable, falling back to direct sheet connection:', apiErr);
      }

      // 2. Direct Google Sheets published CSV fallback
      if (!fetchedData) {
        const targetGid = MONTH_TABS[monthToFetch] || MONTH_TABS['Sep 2026'];
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

  // Handle editing of Present Status by department officials
  const handleStatusChange = (studentKey: string, newStatus: string) => {
    const updated = { ...editedStatuses, [studentKey]: newStatus };
    setEditedStatuses(updated);
    try {
      const storageKey = `thoothukudi_status_edits_${selectedMonth}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
    setStatusSaveNotice(`Status updated for student`);
    setTimeout(() => setStatusSaveNotice(null), 3000);
  };

  // Merge loaded students with department official edits
  const getMergedStudents = (studentsList: StudentRecord[] = []): StudentRecord[] => {
    return studentsList.map(st => {
      const key = st.emisId || String(st.sNo);
      if (editedStatuses[key] !== undefined) {
        const customStatus = editedStatuses[key];
        const lower = customStatus.toLowerCase();
        const isReEnrolled = lower.includes('re-enroll') || lower.includes('reenroll') || lower.includes('readmit');
        const isMigrated = lower.includes('migrat');
        const isStatusNotUpdated = lower === 'status not updated' || lower === 'not updated' || !customStatus.trim();
        return {
          ...st,
          status: customStatus,
          isReEnrolled,
          isMigrated,
          isStatusNotUpdated,
        };
      }
      return st;
    });
  };

  const rawStudents: StudentRecord[] = data?.students || [];
  const allStudents = getMergedStudents(rawStudents);

  // Recalculate summary metrics dynamically to reflect department official edits
  const totalRepeaters = allStudents.filter(s => s.isRepeater).length;
  const totalReEnrolled = allStudents.filter(s => s.isReEnrolled).length;
  const totalMigrated = allStudents.filter(s => s.isMigrated).length;
  const totalCounsellingNeeded = allStudents.filter(s => s.isCounsellingNeeded).length;
  const totalStatusNotUpdated = allStudents.filter(s => s.isStatusNotUpdated).length;

  const summary = {
    potentialDropout: allStudents.length,
    readmitted: totalReEnrolled,
    reEnrolled: totalReEnrolled,
    migrated: totalMigrated,
    repeaters: totalRepeaters,
    counsellingNeeded: totalCounsellingNeeded,
    statusNotUpdated: totalStatusNotUpdated,
  };

  const charts = {
    blockWise: (data?.charts?.blockWise || data?.blockData || []) as Array<{ name: string; count: number }>,
    lineDepartment: (data?.charts?.lineDepartment || data?.lineDepartmentData || []) as Array<{ name: string; count: number; fullName?: string }>,
    classWise: (data?.charts?.classWise || data?.classData || []) as Array<{ name: string; value: number; count?: number; sortOrder?: number }>,
  };

  // Recompute departments and all line departments abstract with merged statuses
  const deptList = [
    'Health Department',
    'Labour Department',
    'DCPO',
    'Social Welfare',
    'Fisheries Department',
    'Revenue Department',
    'DDRO',
    'DSE'
  ];

  const computedDepartments: DepartmentAbstract[] = deptList.map(deptName => {
    const deptStudents = allStudents.filter(s => s.lineDept === deptName);
    return {
      id: deptName.toLowerCase().replace(/\s+/g, '-'),
      name: deptName,
      fullName: deptName,
      potentialDropout: deptStudents.length,
      repeaters: deptStudents.filter(s => s.isRepeater).length,
      reEnrolled: deptStudents.filter(s => s.isReEnrolled).length,
      counsellingNeeded: deptStudents.filter(s => s.isCounsellingNeeded).length,
      statusNotUpdated: deptStudents.filter(s => s.isStatusNotUpdated).length,
      migrated: deptStudents.filter(s => s.isMigrated).length,
      students: deptStudents,
    };
  });

  // Division calculations (Col B count, Col N repeaters, Col R re-enrolled)
  const computedDivisions = ['Kovilpatti', 'Thoothukudi', 'Tiruchendur'].map(divName => {
    const divStudents = allStudents.filter(s => s.division.toLowerCase() === divName.toLowerCase());
    const repeaters = divStudents.filter(s => s.isRepeater).length;
    const reEnrolled = divStudents.filter(s => s.isReEnrolled).length;
    const counsellingNeeded = divStudents.filter(s => s.isCounsellingNeeded).length;

    // Block breakdown
    const blocksInDiv: Record<string, StudentRecord[]> = {};
    divStudents.forEach(s => {
      const b = s.block || 'Other';
      if (!blocksInDiv[b]) blocksInDiv[b] = [];
      blocksInDiv[b].push(s);
    });

    const blockList = Object.entries(blocksInDiv).map(([bName, bStudents]) => ({
      name: bName,
      count: bStudents.length,
      repeaters: bStudents.filter(s => s.isRepeater).length,
      reEnrolled: bStudents.filter(s => s.isReEnrolled).length,
      counsellingNeeded: bStudents.filter(s => s.isCounsellingNeeded).length,
    })).sort((a, b) => b.count - a.count);

    return {
      name: divName,
      totalStudents: divStudents.length,
      repeaters,
      reEnrolled,
      counsellingNeeded,
      blocks: blockList,
    };
  });

  // Revenue Department Taluk-Wise computation (Col C)
  const revenueStudents = allStudents.filter(s => s.lineDept === 'Revenue Department');
  const revenueTaluksMap: Record<string, StudentRecord[]> = {};
  revenueStudents.forEach(s => {
    const t = s.taluk || 'Unassigned Taluk';
    if (!revenueTaluksMap[t]) revenueTaluksMap[t] = [];
    revenueTaluksMap[t].push(s);
  });

  const revenueTalukSummaries = Object.entries(revenueTaluksMap).map(([tName, tStudents]) => ({
    name: tName,
    potentialDropout: tStudents.length,
    repeaters: tStudents.filter(s => s.isRepeater).length,
    reEnrolled: tStudents.filter(s => s.isReEnrolled).length,
    counsellingNeeded: tStudents.filter(s => s.isCounsellingNeeded).length,
    statusNotUpdated: tStudents.filter(s => s.isStatusNotUpdated).length,
    migrated: tStudents.filter(s => s.isMigrated).length,
    students: tStudents,
  })).sort((a, b) => b.potentialDropout - a.potentialDropout);

  const formatLastSync = (iso: string) => {
    if (!iso) return 'Just now';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl border border-slate-700 shadow-xl text-xs">
          <div className="font-semibold text-slate-200">{label || payload[0].name}</div>
          <div className="font-mono font-bold text-teal-300 text-sm mt-0.5">
            {payload[0].value} Students
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
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
        <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-xl max-w-md w-full text-center space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            Connection Error
          </h2>
          <p className="text-xs text-slate-600">{error}</p>
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => fetchData(true)}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 shadow-md"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-100/90 text-slate-800 flex flex-col font-sans">
      {/* Subtle 3D Perspective Background */}
      <Background3D theme="semi-light" intensity="subtle" interactive={true} />

      {/* Status save notice toast */}
      {statusSaveNotice && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{statusSaveNotice}</span>
        </div>
      )}

      {/* Executive Classic Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          
          {/* Dashboard Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md border border-slate-700">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                Thoothukudi district - Potential Dropout dashboard
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                District Administration, Thoothukudi
              </p>
            </div>
          </div>

          {/* Right Header Controls: Month Filter (BIG SIZE as requested) + Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            {/* BIG SIZE Month Filter */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border-2 border-slate-300 shadow-sm hover:border-slate-400 transition-colors">
              <Calendar className="w-4 h-4 text-slate-700 shrink-0" />
              <label htmlFor="month-select" className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Month:
              </label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => {
                  const newMonth = e.target.value;
                  setSelectedMonth(newMonth);
                  fetchData(false, newMonth);
                }}
                className="text-sm sm:text-base font-extrabold text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
                title="Select month sheet tab"
              >
                {(data?.availableMonths || ['Sep 2026', 'Oct 2026', 'Nov 2026']).map((m: string) => (
                  <option key={m} value={m} className="font-bold text-slate-900 bg-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:translate-y-0.5 ${
                refreshing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-white' : 'text-white'}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Layout: Left Slicers Sidebar + Dynamic Workspace */}
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col md:flex-row p-4 sm:p-6 gap-6 relative z-10">
        
        {/* Left Sidebar — Slicers */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm sticky top-20">
            <div className="px-2.5 py-1.5 mb-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-700" />
                Department Slicers
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
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
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all duration-150 ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-md border border-slate-800'
                        : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="tracking-tight">{slicer}</span>
                    </div>

                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform duration-150 ${
                        isSelected ? 'text-white translate-x-0.5' : 'text-slate-400 opacity-60'
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 min-w-0">
          
          {/* ======================================================== */}
          {/* 1. COMMON DASHBOARD VIEW */}
          {/* ======================================================== */}
          {selectedSlicer === 'Common Dashboard' && (
            <div className="space-y-6">
              
              {/* Top Row — 5 Prominent Classic Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                
                {/* Box 1: Potential Dropout — Classic Oxford Navy */}
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Potential Dropout
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-2.5 font-mono tracking-tight">
                    {summary.potentialDropout}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 font-semibold pt-2 border-t border-slate-100 flex justify-between">
                    <span>Identified Students</span>
                    <span className="font-bold text-slate-700">100%</span>
                  </div>
                </div>

                {/* Box 2: Readmitted / Re-enrolled — Classic Forest Green */}
                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-sm hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wider">
                      Readmitted
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-emerald-950 mt-2.5 font-mono tracking-tight">
                    {summary.reEnrolled}
                  </div>
                  <div className="mt-2 text-[10px] text-emerald-700 font-semibold pt-2 border-t border-emerald-100 flex justify-between">
                    <span>Re-enrolled in School</span>
                    <span className="font-bold text-emerald-900">
                      {summary.potentialDropout > 0 ? ((summary.reEnrolled / summary.potentialDropout) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>

                {/* Box 3: Migrated — Classic Slate Amber */}
                <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-sm hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider">
                      Migrated
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center shadow-xs">
                      <MapPin className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-amber-950 mt-2.5 font-mono tracking-tight">
                    {summary.migrated}
                  </div>
                  <div className="mt-2 text-[10px] text-amber-700 font-semibold pt-2 border-t border-amber-100 flex justify-between">
                    <span>Relocated District/Block</span>
                    <span className="font-bold text-amber-900">
                      {summary.potentialDropout > 0 ? ((summary.migrated / summary.potentialDropout) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>

                {/* Box 4: Repeaters — Classic Purple / Indigo */}
                <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm hover:border-purple-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-purple-900 uppercase tracking-wider">
                      Repeaters
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center shadow-xs">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-purple-950 mt-2.5 font-mono tracking-tight">
                    {summary.repeaters}
                  </div>
                  <div className="mt-2 text-[10px] text-purple-700 font-semibold pt-2 border-t border-purple-100 flex justify-between">
                    <span>Repeater Students</span>
                    <span className="font-bold text-purple-900">
                      {summary.potentialDropout > 0 ? ((summary.repeaters / summary.potentialDropout) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>

                {/* Box 5: Counselling Needed Students — Classic Crimson (From Col Q) */}
                <div className="bg-white border-2 border-rose-200 rounded-2xl p-4 shadow-sm hover:border-rose-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-rose-900 uppercase tracking-wider">
                      Counselling Needed
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-rose-700 text-white flex items-center justify-center shadow-xs">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-rose-950 mt-2.5 font-mono tracking-tight">
                    {summary.counsellingNeeded}
                  </div>
                  <div className="mt-2 text-[10px] text-rose-700 font-semibold pt-2 border-t border-rose-100 flex justify-between">
                    <span>Requires Counselling</span>
                    <span className="font-bold text-rose-900">
                      {summary.potentialDropout > 0 ? ((summary.counsellingNeeded / summary.potentialDropout) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>

              </div>

              {/* Middle Section — Two Classic Bar Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Bar Chart 1: Block-Wise Potential Dropout */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                        Block-Wise Potential Dropout
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      13 Educational Blocks
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3 font-medium">
                    Total potential dropout student counts per block for {selectedMonth}
                  </p>
                  
                  <div className="h-64 sm:h-72 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={charts.blockWise}
                        margin={{ top: 20, right: 10, left: -20, bottom: 45 }}
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
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                        <Bar
                          dataKey="count"
                          fill="#1e3a5f"
                          radius={[4, 4, 0, 0]}
                          label={{ position: 'top', fill: '#1e3a5f', fontSize: 11, fontWeight: 700 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar Chart 2: Line Department */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-teal-800"></div>
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                        Line Department
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">
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
                        margin={{ top: 20, right: 10, left: -20, bottom: 45 }}
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
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                        <Bar
                          dataKey="count"
                          fill="#0f766e"
                          radius={[4, 4, 0, 0]}
                          label={{ position: 'top', fill: '#0f766e', fontSize: 11, fontWeight: 700 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Bottom Section — Class-Wise Potential Dropout */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-800"></div>
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      Class-Wise Potential Dropout
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
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
                      margin={{ top: 20, right: 10, left: -20, bottom: 25 }}
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
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        label={{ position: 'top', fill: '#1e3a5f', fontSize: 11, fontWeight: 700 }}
                      >
                        {(charts.classWise || []).map((_entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CLASSIC_CHART_COLORS[index % CLASSIC_CHART_COLORS.length]}
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
          {/* 2. DIVISION SLICER VIEW (CLEAN DIVISION NAMES ALONE) */}
          {/* ======================================================== */}
          {selectedSlicer === 'Division' && (
            <div className="space-y-6">
              
              {/* 3 Division Cards showing division names alone (Kovilpatti, Thoothukudi, Tiruchendur) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {computedDivisions.map((div) => {
                  return (
                    <div
                      key={div.name}
                      className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
                    >
                      <div>
                        {/* Division Name alone & Total Count Badge */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h2 className="text-lg font-black text-slate-900 tracking-tight">
                            {div.name}
                          </h2>
                          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold text-white bg-slate-900 shadow-xs">
                            {div.totalStudents} Students
                          </span>
                        </div>

                        {/* Metric Boxes: Potential Dropout, Repeaters, Re-Enrolled, Counselling */}
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                            <span className="text-[10px] font-bold text-slate-600 uppercase block">
                              Dropouts
                            </span>
                            <span className="text-lg font-mono font-black text-slate-900">
                              {div.totalStudents}
                            </span>
                          </div>

                          <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 text-center">
                            <span className="text-[10px] font-bold text-purple-900 uppercase block">
                              Repeaters
                            </span>
                            <span className="text-lg font-mono font-black text-purple-950">
                              {div.repeaters}
                            </span>
                          </div>

                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                            <span className="text-[10px] font-bold text-emerald-900 uppercase block">
                              Re-Enrolled
                            </span>
                            <span className="text-lg font-mono font-black text-emerald-950">
                              {div.reEnrolled}
                            </span>
                          </div>
                        </div>

                        {/* Block Breakdown */}
                        <div className="mt-4 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider pb-1 border-b border-slate-100">
                            <span>Block</span>
                            <span>Rep / Re-Enr / Total</span>
                          </div>
                          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                            {div.blocks.map((b) => (
                              <div key={b.name} className="flex items-center justify-between text-xs py-1.5 px-1 hover:bg-slate-50 text-slate-700">
                                <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[120px]">
                                  {b.name}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 font-mono font-bold border border-purple-100">
                                    {b.repeaters}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 font-mono font-bold border border-emerald-100">
                                    {b.reEnrolled}
                                  </span>
                                  <span className="font-mono font-black text-slate-900 min-w-6 text-right text-xs">
                                    {b.count}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>{div.blocks.length} Blocks</span>
                        <span className="font-bold text-slate-700">{div.name} Division</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Division Student Directory */}
              {(() => {
                const filteredDivStudents = allStudents.filter((st) => {
                  const matchDiv = divisionFilter === 'All' || 
                    st.division.toLowerCase() === divisionFilter.toLowerCase();
                  const matchSearch = !divisionSearch ||
                    st.studentName.toLowerCase().includes(divisionSearch.toLowerCase()) ||
                    st.block.toLowerCase().includes(divisionSearch.toLowerCase()) ||
                    st.school.toLowerCase().includes(divisionSearch.toLowerCase()) ||
                    (st.emisId && st.emisId.includes(divisionSearch));
                  return matchDiv && matchSearch;
                });

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-700" />
                          <span>Division Student Records ({filteredDivStudents.length})</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Records across Kovilpatti, Thoothukudi, and Tiruchendur
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Division Filter Buttons */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                          {['All', 'Kovilpatti', 'Thoothukudi', 'Tiruchendur'].map((df) => (
                            <button
                              key={df}
                              onClick={() => setDivisionFilter(df)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                divisionFilter === df
                                  ? 'bg-white text-slate-900 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {df}
                            </button>
                          ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search name, block, EMIS..."
                            value={divisionSearch}
                            onChange={(e) => setDivisionSearch(e.target.value)}
                            className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 w-full sm:w-52"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-96 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3">S.No</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">EMIS ID</th>
                            <th className="py-2.5 px-3">Division</th>
                            <th className="py-2.5 px-3">Block</th>
                            <th className="py-2.5 px-3">Class</th>
                            <th className="py-2.5 px-3">School</th>
                            <th className="py-2.5 px-3">Repeaters</th>
                            <th className="py-2.5 px-3">Present Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredDivStudents.slice(0, 100).map((st, idx) => (
                            <tr key={st.emisId ? `div-st-${st.emisId}-${idx}` : `div-st-${st.sNo}-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 font-mono font-bold text-slate-500">{st.sNo}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{st.studentName}</td>
                              <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{st.emisId || '-'}</td>
                              <td className="py-2 px-3 text-[11px] font-semibold text-slate-800">{st.division}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800">{st.block}</td>
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                  Std {st.std} {st.sec ? `(${st.sec})` : ''}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600 text-[11px] max-w-xs truncate">{st.school}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  st.isRepeater
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {st.repeaterStatus}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  st.isReEnrolled
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {st.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* ======================================================== */}
          {/* 3. ALL LINE DEPARTMENT ABSTRACT SLICER VIEW */}
          {/* ======================================================== */}
          {selectedSlicer === 'All Line Department' && (
            <div className="space-y-6">
              
              {/* Header and Download Controls */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Layers className="w-5 h-5 text-slate-800" />
                    <span>All Line Department Abstract</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consolidated cross-department abstract for {selectedMonth} across Thoothukudi District
                  </p>
                </div>

                {/* Export Options for All Line Department Abstract */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => exportAbstractToExcel(computedDepartments, `All_Line_Departments_Abstract_${selectedMonth}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                    title="Download Excel format"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => exportStudentsToWord(allStudents, `Thoothukudi_All_Departments_Students_${selectedMonth}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs"
                    title="Download Word format"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Word (.doc)</span>
                  </button>

                  <button
                    onClick={() => exportStudentsToDocs(allStudents, `Thoothukudi_All_Departments_Students_${selectedMonth}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs"
                    title="Download Docs format"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Docs</span>
                  </button>
                </div>
              </div>

              {/* 6 Summary Metric Cards across all line departments */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-black text-slate-600 uppercase block">Total Dropouts</span>
                  <span className="text-xl font-mono font-black text-slate-900 mt-1 block">
                    {computedDepartments.reduce((acc, d) => acc + d.potentialDropout, 0)}
                  </span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-black text-purple-900 uppercase block">Repeaters</span>
                  <span className="text-xl font-mono font-black text-purple-950 mt-1 block">
                    {computedDepartments.reduce((acc, d) => acc + d.repeaters, 0)}
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-black text-emerald-900 uppercase block">Re-Enrolled</span>
                  <span className="text-xl font-mono font-black text-emerald-950 mt-1 block">
                    {computedDepartments.reduce((acc, d) => acc + d.reEnrolled, 0)}
                  </span>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-black text-rose-900 uppercase block">Counselling Needed</span>
                  <span className="text-xl font-mono font-black text-rose-950 mt-1 block">
                    {computedDepartments.reduce((acc, d) => acc + d.counsellingNeeded, 0)}
                  </span>
                </div>

                <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-black text-slate-700 uppercase block">Status Not Updated</span>
                  <span className="text-xl font-mono font-black text-slate-900 mt-1 block">
                    {computedDepartments.reduce((acc, d) => acc + d.statusNotUpdated, 0)}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-black text-amber-900 uppercase block">Migrated</span>
                  <span className="text-xl font-mono font-black text-amber-950 mt-1 block">
                    {computedDepartments.reduce((acc, d) => acc + d.migrated, 0)}
                  </span>
                </div>
              </div>

              {/* Comprehensive Abstract Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      Department-Wise Abstract Comparison
                    </h3>
                    <p className="text-xs text-slate-500">
                      Total potential dropouts, repeaters, re-enrolled, counselling needed, status not updated & migrated
                    </p>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search department..."
                      value={abstractSearch}
                      onChange={(e) => setAbstractSearch(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 w-full sm:w-56"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Line Department</th>
                        <th className="py-3 px-4 text-center">Total Potential Dropout</th>
                        <th className="py-3 px-4 text-center">Repeaters</th>
                        <th className="py-3 px-4 text-center">Re-Enrolled</th>
                        <th className="py-3 px-4 text-center">Counselling Needed</th>
                        <th className="py-3 px-4 text-center">Status Not Updated</th>
                        <th className="py-3 px-4 text-center">Migrated</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {computedDepartments
                        .filter(d => !abstractSearch || d.name.toLowerCase().includes(abstractSearch.toLowerCase()))
                        .map((dept) => {
                          const meta = DEPT_META[dept.name] || DEPT_META['Common Dashboard'];
                          const IconComponent = meta.icon;

                          return (
                            <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                                    <IconComponent className="w-3.5 h-3.5" />
                                  </div>
                                  <span>{dept.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center font-mono font-black text-slate-900">
                                {dept.potentialDropout}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 font-mono font-bold border border-purple-100">
                                  {dept.repeaters}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 font-mono font-bold border border-emerald-100">
                                  {dept.reEnrolled}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-900 font-mono font-bold border border-rose-100">
                                  {dept.counsellingNeeded}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono font-bold border border-slate-200">
                                  {dept.statusNotUpdated}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-mono font-bold border border-amber-100">
                                  {dept.migrated}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => setSelectedSlicer(dept.name as SlicerType)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 hover:text-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                                >
                                  <span>Open</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                      <tr>
                        <td className="py-3 px-4">Total Across All Departments</td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm">
                          {computedDepartments.reduce((acc, d) => acc + d.potentialDropout, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-purple-950">
                          {computedDepartments.reduce((acc, d) => acc + d.repeaters, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-emerald-950">
                          {computedDepartments.reduce((acc, d) => acc + d.reEnrolled, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-rose-950">
                          {computedDepartments.reduce((acc, d) => acc + d.counsellingNeeded, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-slate-900">
                          {computedDepartments.reduce((acc, d) => acc + d.statusNotUpdated, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-sm text-amber-950">
                          {computedDepartments.reduce((acc, d) => acc + d.migrated, 0)}
                        </td>
                        <td className="py-3 px-4 text-right"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* 4. REVENUE DEPARTMENT (TALUK-WISE SOURCED FROM COL C) */}
          {/* ======================================================== */}
          {selectedSlicer === 'Revenue Department' && (
            <div className="space-y-6">
              
              {/* Header and Download Controls */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-teal-800" />
                    <span>Revenue Department — Taluk-Wise Dashboard</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Taluk-wise monitoring across Thoothukudi District for {selectedMonth}
                  </p>
                </div>

                {/* Download Options */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => exportStudentsToExcel(revenueStudents, `Revenue_Department_Taluk_Wise_${selectedMonth}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                    title="Download Excel format"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => exportStudentsToWord(revenueStudents, `Revenue_Department_Students_${selectedMonth}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs"
                    title="Download Word format"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Word (.doc)</span>
                  </button>

                  <button
                    onClick={() => exportStudentsToDocs(revenueStudents, `Revenue_Department_Students_${selectedMonth}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs"
                    title="Download Docs format"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Docs</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Boxes for Revenue Department */}
              {(() => {
                const repCount = revenueStudents.filter(s => s.isRepeater).length;
                const reEnrCount = revenueStudents.filter(s => s.isReEnrolled).length;
                const counselCount = revenueStudents.filter(s => s.isCounsellingNeeded).length;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Box 1: No. of Potential Dropout */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                        Potential Dropout
                      </span>
                      <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                        {revenueStudents.length}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-medium">
                        Assigned to Revenue Department
                      </div>
                    </div>

                    {/* Box 2: Re-enrolled */}
                    <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-sm">
                      <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block">
                        Re-Enrolled
                      </span>
                      <div className="text-3xl font-black text-emerald-950 mt-2 font-mono">
                        {reEnrCount}
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-1 font-medium">
                        Successfully Re-admitted
                      </div>
                    </div>

                    {/* Box 3: Repeaters */}
                    <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm">
                      <span className="text-[11px] font-black text-purple-900 uppercase tracking-wider block">
                        Repeaters
                      </span>
                      <div className="text-3xl font-black text-purple-950 mt-2 font-mono">
                        {repCount}
                      </div>
                      <div className="text-[11px] text-purple-700 mt-1 font-medium">
                        Repeaters Caseload
                      </div>
                    </div>

                    {/* Box 4: Counselling Needed */}
                    <div className="bg-white border-2 border-rose-200 rounded-2xl p-4 shadow-sm">
                      <span className="text-[11px] font-black text-rose-900 uppercase tracking-wider block">
                        Counselling Needed
                      </span>
                      <div className="text-3xl font-black text-rose-950 mt-2 font-mono">
                        {counselCount}
                      </div>
                      <div className="text-[11px] text-rose-700 mt-1 font-medium">
                        Emotional & Psychological Support
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Taluk-Wise Summary Grid */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-teal-700" />
                      <span>Taluk-Wise Distribution (Revenue Department)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Breakdown across taluks in Thoothukudi District
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {revenueTalukSummaries.length} Taluks
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {revenueTalukSummaries.map((taluk) => {
                    const isSelected = revenueTalukFilter === taluk.name;
                    return (
                      <button
                        key={taluk.name}
                        onClick={() => setRevenueTalukFilter(isSelected ? 'All' : taluk.name)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                            : 'bg-slate-50 hover:bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate">{taluk.name}</span>
                          <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-900 border border-slate-200'
                          }`}>
                            {taluk.potentialDropout}
                          </span>
                        </div>
                        <div className={`mt-2 flex items-center justify-between text-[10px] ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}>
                          <span>Rep: {taluk.repeaters}</span>
                          <span>Re-Enr: {taluk.reEnrolled}</span>
                          <span>Couns: {taluk.counsellingNeeded}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Taluk-Wise Student Directory with ALL Columns and Editable Present Status */}
              {(() => {
                const filteredTalukStudents = revenueStudents.filter((st) => {
                  const matchTaluk = revenueTalukFilter === 'All' || st.taluk === revenueTalukFilter;
                  const matchSearch = !revenueSearch ||
                    st.studentName.toLowerCase().includes(revenueSearch.toLowerCase()) ||
                    st.school.toLowerCase().includes(revenueSearch.toLowerCase()) ||
                    st.block.toLowerCase().includes(revenueSearch.toLowerCase()) ||
                    (st.emisId && st.emisId.includes(revenueSearch));
                  return matchTaluk && matchSearch;
                });

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                          <Users className="w-4 h-4 text-teal-700" />
                          <span>
                            Taluk Student Records ({filteredTalukStudents.length})
                            {revenueTalukFilter !== 'All' && ` — ${revenueTalukFilter}`}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Officials can edit the Present Status dropdown below. Changes update counts and save automatically.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {revenueTalukFilter !== 'All' && (
                          <button
                            onClick={() => setRevenueTalukFilter('All')}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                          >
                            Reset Taluk Filter
                          </button>
                        )}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Filter name, EMIS, school..."
                            value={revenueSearch}
                            onChange={(e) => setRevenueSearch(e.target.value)}
                            className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 w-full sm:w-56"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Table with ALL Columns and Editable Present Status Dropdown */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[32rem] overflow-y-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3">S.No</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">EMIS ID</th>
                            <th className="py-2.5 px-3">Taluk</th>
                            <th className="py-2.5 px-3">Division</th>
                            <th className="py-2.5 px-3">Block</th>
                            <th className="py-2.5 px-3">School</th>
                            <th className="py-2.5 px-3">Class</th>
                            <th className="py-2.5 px-3">Gender</th>
                            <th className="py-2.5 px-3">Repeater</th>
                            <th className="py-2.5 px-3">Counselling</th>
                            <th className="py-2.5 px-3 min-w-44 bg-amber-50/80 text-amber-950">
                              Present Status (Editable Dropdown)
                            </th>
                            <th className="py-2.5 px-3">Contact No</th>
                            <th className="py-2.5 px-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredTalukStudents.map((st, idx) => {
                            const key = st.emisId || String(st.sNo);
                            return (
                              <tr key={`rev-${key}-${idx}`} className="hover:bg-teal-50/20 transition-colors">
                                <td className="py-2 px-3 font-mono font-bold text-slate-500">{st.sNo}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">{st.studentName}</td>
                                <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{st.emisId || '-'}</td>
                                <td className="py-2 px-3 font-semibold text-teal-900 bg-teal-50/50">{st.taluk}</td>
                                <td className="py-2 px-3 text-slate-700">{st.division}</td>
                                <td className="py-2 px-3 font-semibold text-slate-800">{st.block}</td>
                                <td className="py-2 px-3 text-slate-600 max-w-xs truncate">{st.school}</td>
                                <td className="py-2 px-3 font-mono text-slate-700">
                                  Std {st.std} {st.sec ? `(${st.sec})` : ''}
                                </td>
                                <td className="py-2 px-3 text-slate-600">{st.gender}</td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    st.isRepeater
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {st.repeaterStatus}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    st.isCounsellingNeeded
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {st.counsellingRequired}
                                  </span>
                                </td>

                                {/* EDITABLE PRESENT STATUS DROPDOWN FOR OFFICIALS */}
                                <td className="py-1.5 px-3 bg-amber-50/40">
                                  <select
                                    value={st.status}
                                    onChange={(e) => handleStatusChange(key, e.target.value)}
                                    className="w-full text-xs font-bold py-1 px-2 rounded-lg border border-amber-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                                  >
                                    {PRESENT_STATUS_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                    {/* Include sheet original value if not in list */}
                                    {!PRESENT_STATUS_OPTIONS.includes(st.status) && (
                                      <option value={st.status}>{st.status}</option>
                                    )}
                                  </select>
                                </td>

                                <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{st.contactNo || '-'}</td>
                                <td className="py-2 px-3 text-[11px] text-slate-500 max-w-xs truncate">{st.remarks || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* ======================================================== */}
          {/* 5. INDIVIDUAL DEPARTMENT SLICERS (HEALTH, LABOUR, DCPO, etc.) */}
          {/* ======================================================== */}
          {selectedSlicer !== 'Common Dashboard' && 
           selectedSlicer !== 'Division' && 
           selectedSlicer !== 'All Line Department' && 
           selectedSlicer !== 'Revenue Department' && (
            <div className="space-y-6">
              
              {/* Header without long description, with quick Export Options */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const meta = DEPT_META[selectedSlicer] || DEPT_META['Common Dashboard'];
                    const IconComponent = meta.icon;
                    return (
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                        <IconComponent className="w-6 h-6" />
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      {selectedSlicer} Dashboard
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Intervention & Tracking for {selectedMonth}
                    </p>
                  </div>
                </div>

                {/* Export Students List in Excel, Word, Docs format as requested */}
                {(() => {
                  const currentDept = computedDepartments.find(d => d.name === selectedSlicer);
                  const deptStudents = currentDept?.students || [];

                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => exportStudentsToExcel(deptStudents, `${selectedSlicer}_Students_${selectedMonth}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                        title="Download Excel format"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Excel (.xlsx)</span>
                      </button>

                      <button
                        onClick={() => exportStudentsToWord(deptStudents, `${selectedSlicer}_Students_${selectedMonth}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs"
                        title="Download Word format"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Word (.doc)</span>
                      </button>

                      <button
                        onClick={() => exportStudentsToDocs(deptStudents, `${selectedSlicer}_Students_${selectedMonth}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs"
                        title="Download Docs format"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Docs</span>
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* 4 Summary Boxes: Potential Dropout, Re-Enrolled, Repeaters, Counselling Needed */}
              {(() => {
                const currentDept = computedDepartments.find(d => d.name === selectedSlicer);
                const deptStudents = currentDept?.students || [];
                const repCount = deptStudents.filter(s => s.isRepeater).length;
                const reEnrCount = deptStudents.filter(s => s.isReEnrolled).length;
                const counselCount = deptStudents.filter(s => s.isCounsellingNeeded).length;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Box 1: No. of Potential Dropout in this Department */}
                    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                        Potential Dropout
                      </span>
                      <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
                        {deptStudents.length}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-medium">
                        Students assigned to {selectedSlicer}
                      </div>
                    </div>

                    {/* Box 2: Re-Enrolled */}
                    <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-sm">
                      <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wider block">
                        Re-Enrolled
                      </span>
                      <div className="text-3xl font-black text-emerald-950 mt-2 font-mono">
                        {reEnrCount}
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-1 font-medium">
                        Re-enrolled in School
                      </div>
                    </div>

                    {/* Box 3: Repeaters */}
                    <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm">
                      <span className="text-[11px] font-black text-purple-900 uppercase tracking-wider block">
                        Repeaters
                      </span>
                      <div className="text-3xl font-black text-purple-950 mt-2 font-mono">
                        {repCount}
                      </div>
                      <div className="text-[11px] text-purple-700 mt-1 font-medium">
                        Repeaters Caseload
                      </div>
                    </div>

                    {/* Box 4: Counselling Needed */}
                    <div className="bg-white border-2 border-rose-200 rounded-2xl p-4 shadow-sm">
                      <span className="text-[11px] font-black text-rose-900 uppercase tracking-wider block">
                        Counselling Needed
                      </span>
                      <div className="text-3xl font-black text-rose-950 mt-2 font-mono">
                        {counselCount}
                      </div>
                      <div className="text-[11px] text-rose-700 mt-1 font-medium">
                        Emotional Support / Guidance
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Student Directory with ALL Columns and Editable Present Status Dropdown */}
              {(() => {
                const currentDept = computedDepartments.find(d => d.name === selectedSlicer);
                const deptStudents: StudentRecord[] = currentDept?.students || [];
                const filteredStudents = deptStudents.filter((s) => 
                  !deptSearch || 
                  s.studentName.toLowerCase().includes(deptSearch.toLowerCase()) ||
                  s.block.toLowerCase().includes(deptSearch.toLowerCase()) ||
                  s.school.toLowerCase().includes(deptSearch.toLowerCase()) ||
                  s.taluk.toLowerCase().includes(deptSearch.toLowerCase()) ||
                  (s.emisId && s.emisId.includes(deptSearch))
                );

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-700" />
                          <span>Assigned Student Records ({filteredStudents.length})</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Department officials can edit and fill the Present Status dropdown for each student below.
                        </p>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search student, block, EMIS..."
                          value={deptSearch}
                          onChange={(e) => setDeptSearch(e.target.value)}
                          className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 w-full sm:w-56"
                        />
                      </div>
                    </div>

                    {/* Table with ALL Columns and Editable Present Status Dropdown */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[32rem] overflow-y-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3">S.No</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">EMIS ID</th>
                            <th className="py-2.5 px-3">Division</th>
                            <th className="py-2.5 px-3">Taluk</th>
                            <th className="py-2.5 px-3">Block</th>
                            <th className="py-2.5 px-3">School</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Gender</th>
                            <th className="py-2.5 px-3">Class</th>
                            <th className="py-2.5 px-3">Address</th>
                            <th className="py-2.5 px-3">Contact No</th>
                            <th className="py-2.5 px-3">Repeater</th>
                            <th className="py-2.5 px-3">Dropout Reason</th>
                            <th className="py-2.5 px-3">Counselling</th>
                            <th className="py-2.5 px-3 min-w-44 bg-amber-50/80 text-amber-950">
                              Present Status (Editable Dropdown)
                            </th>
                            <th className="py-2.5 px-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredStudents.map((st, idx) => {
                            const key = st.emisId || String(st.sNo);
                            return (
                              <tr key={`st-${key}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2 px-3 font-mono font-bold text-slate-500">{st.sNo}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">{st.studentName}</td>
                                <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">{st.emisId || '-'}</td>
                                <td className="py-2 px-3 text-slate-700">{st.division}</td>
                                <td className="py-2 px-3 font-semibold text-slate-800">{st.taluk}</td>
                                <td className="py-2 px-3 font-semibold text-slate-800">{st.block}</td>
                                <td className="py-2 px-3 text-slate-600 max-w-xs truncate">{st.school}</td>
                                <td className="py-2 px-3 text-slate-500 text-[11px]">{st.category}</td>
                                <td className="py-2 px-3 text-slate-600">{st.gender}</td>
                                <td className="py-2 px-3 font-mono text-slate-700">
                                  Std {st.std} {st.sec ? `(${st.sec})` : ''}
                                </td>
                                <td className="py-2 px-3 text-[11px] text-slate-500 max-w-xs truncate">{st.address || '-'}</td>
                                <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{st.contactNo || '-'}</td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    st.isRepeater
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {st.repeaterStatus}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-[11px] text-slate-500 max-w-xs truncate">{st.dropoutReason || '-'}</td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    st.isCounsellingNeeded
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {st.counsellingRequired}
                                  </span>
                                </td>

                                {/* EDITABLE PRESENT STATUS DROPDOWN FOR OFFICIALS */}
                                <td className="py-1.5 px-3 bg-amber-50/40">
                                  <select
                                    value={st.status}
                                    onChange={(e) => handleStatusChange(key, e.target.value)}
                                    className="w-full text-xs font-bold py-1 px-2 rounded-lg border border-amber-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                                  >
                                    {PRESENT_STATUS_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                    {!PRESENT_STATUS_OPTIONS.includes(st.status) && (
                                      <option value={st.status}>{st.status}</option>
                                    )}
                                  </select>
                                </td>

                                <td className="py-2 px-3 text-[11px] text-slate-500 max-w-xs truncate">{st.remarks || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
