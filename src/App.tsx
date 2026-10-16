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
  Search, 
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
  Filter, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  HelpCircle, 
  Check, 
  ArrowRight,
  Lock,
  Unlock,
  ShieldCheck,
  LogOut,
  KeyRound
} from 'lucide-react';
import { 
  SPREADSHEET_ID, 
  MONTH_TABS, 
  processSheetCSV, 
  StudentRecord, 
  DepartmentAbstract,
  DepartmentCredential,
  DEFAULT_DEPARTMENT_CREDENTIALS,
  fetchLiveCredentials
} from './sheetData';
import { Background3D } from './components/Background3D';
import { TamilNaduLogo } from './components/TamilNaduLogo';
import { DepartmentLoginForm } from './components/DepartmentLoginForm';
import { exportStudentsToExcel, exportStudentsToWord, exportStudentsToDocs, exportAbstractToExcel } from './exportUtils';

// Slicers: Overview (formerly Common Dashboard), Division, Line Department Overview, Counselling, and 8 line departments
const SLICERS = [
  'Overview',
  'Division',
  'Line Department Overview',
  'Counselling',
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

// Classic styling configuration for departments & overview
const DEPT_META: Record<string, { icon: React.ElementType; color: string; badge: string; bg: string }> = {
  'Overview': { icon: Layers, color: '#1e3a5f', badge: 'bg-blue-50 text-blue-900 border border-blue-300', bg: 'from-slate-800 to-slate-900' },
  'Division': { icon: Building2, color: '#0f766e', badge: 'bg-teal-50 text-teal-900 border border-teal-300', bg: 'from-teal-800 to-slate-900' },
  'Line Department Overview': { icon: Layers, color: '#1e3a8a', badge: 'bg-blue-50 text-blue-900 border border-blue-300', bg: 'from-blue-900 to-indigo-950' },
  'Counselling': { icon: HeartPulse, color: '#2563eb', badge: 'bg-blue-50 text-blue-900 border border-blue-300', bg: 'from-blue-900 to-indigo-950' },
  'Health Department': { icon: HeartPulse, color: '#047857', badge: 'bg-emerald-50 text-emerald-900 border border-emerald-300', bg: 'from-emerald-800 to-teal-950' },
  'Labour Department': { icon: Briefcase, color: '#b45309', badge: 'bg-amber-50 text-amber-900 border border-amber-300', bg: 'from-amber-800 to-yellow-950' },
  'DCPO': { icon: ShieldAlert, color: '#4338ca', badge: 'bg-indigo-50 text-indigo-900 border border-indigo-300', bg: 'from-indigo-900 to-slate-900' },
  'Social Welfare': { icon: UserCheck, color: '#9d174d', badge: 'bg-pink-50 text-pink-900 border border-pink-300', bg: 'from-pink-900 to-rose-950' },
  'Fisheries Department': { icon: Anchor, color: '#0369a1', badge: 'bg-sky-50 text-sky-900 border border-sky-300', bg: 'from-sky-900 to-cyan-950' },
  'Revenue Department': { icon: Landmark, color: '#0f766e', badge: 'bg-teal-50 text-teal-900 border border-teal-300', bg: 'from-teal-900 to-slate-950' },
  'DDRO': { icon: Accessibility, color: '#6d28d9', badge: 'bg-purple-50 text-purple-900 border border-purple-300', bg: 'from-purple-900 to-violet-950' },
  'DSE': { icon: BookOpen, color: '#1d4ed8', badge: 'bg-blue-50 text-blue-900 border border-blue-300', bg: 'from-blue-900 to-slate-900' },
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
  const [selectedSlicer, setSelectedSlicer] = useState<SlicerType>('Overview');
  const [selectedMonth, setSelectedMonth] = useState<string>('Sep 2026');
  const [deptSearch, setDeptSearch] = useState<string>('');
  const [divisionFilter, setDivisionFilter] = useState<string>('All');
  const [divisionSearch, setDivisionSearch] = useState<string>('');
  const [revenueTalukFilter, setRevenueTalukFilter] = useState<string>('All');
  const [revenueSearch, setRevenueSearch] = useState<string>('');
  const [abstractSearch, setAbstractSearch] = useState<string>('');
  const [counsellingSearch, setCounsellingSearch] = useState<string>('');
  const [counsellingDeptFilter, setCounsellingDeptFilter] = useState<string>('All');
  const [counsellingGenderFilter, setCounsellingGenderFilter] = useState<string>('All');
  
  // Department-edited status, dropout reason, counselling, and remarks state (keyed by student EMIS or sNo)
  const [editedStatuses, setEditedStatuses] = useState<Record<string, string>>({});
  const [editedDropoutReasons, setEditedDropoutReasons] = useState<Record<string, string>>({});
  const [editedCounselling, setEditedCounselling] = useState<Record<string, string>>({});
  const [editedRemarks, setEditedRemarks] = useState<Record<string, string>>({});
  const [statusSaveNotice, setStatusSaveNotice] = useState<string | null>(null);

  // Department Credentials (taken live from Google Sheet 'User and Password' tab with fallback)
  const [deptCredentials, setDeptCredentials] = useState<Record<string, DepartmentCredential>>(DEFAULT_DEPARTMENT_CREDENTIALS);

  // Authenticated department sessions (persisted in localStorage)
  const [authenticatedDepts, setAuthenticatedDepts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('thoothukudi_authenticated_depts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Selected class boxes in Class-Wise Potential Dropout to show Boys & Girls breakdown
  const [selectedClassBoxes, setSelectedClassBoxes] = useState<Record<string, boolean>>({});

  const handleToggleClassBox = (className: string) => {
    setSelectedClassBoxes(prev => ({
      ...prev,
      [className]: !prev[className]
    }));
  };

  const handleToggleAllClassBoxes = (allClassNames: string[]) => {
    const allSelected = allClassNames.length > 0 && allClassNames.every(name => selectedClassBoxes[name]);
    const next: Record<string, boolean> = {};
    allClassNames.forEach(name => {
      next[name] = !allSelected;
    });
    setSelectedClassBoxes(next);
  };

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch live credentials from Google Sheet "User and Password" tab on mount
  useEffect(() => {
    fetchLiveCredentials().then((creds) => {
      if (creds && Object.keys(creds).length > 0) {
        setDeptCredentials(creds);
      }
    }).catch((err) => {
      console.warn('Error fetching live credentials from sheet:', err);
    });
  }, []);

  // Department Login and Logout Handlers
  const handleDepartmentLoginSuccess = (deptKey: string, userId: string) => {
    const updated = { ...authenticatedDepts, [deptKey]: true };
    setAuthenticatedDepts(updated);
    try {
      localStorage.setItem('thoothukudi_authenticated_depts', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save auth state to localStorage', e);
    }
    setStatusSaveNotice(`Authenticated as ${userId} for ${deptKey}`);
    setTimeout(() => setStatusSaveNotice(null), 3000);
  };

  const handleDepartmentLogout = (deptKey: string) => {
    const updated = { ...authenticatedDepts, [deptKey]: false };
    setAuthenticatedDepts(updated);
    try {
      localStorage.setItem('thoothukudi_authenticated_depts', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save auth state to localStorage', e);
    }
    setStatusSaveNotice(`Logged out of ${deptKey}`);
    setTimeout(() => setStatusSaveNotice(null), 2500);
  };

  // Load saved status, dropout reasons, counselling, and remarks edits from localStorage on mount/month change
  useEffect(() => {
    try {
      const statusKey = `thoothukudi_status_edits_${selectedMonth}`;
      const savedStatuses = localStorage.getItem(statusKey);
      if (savedStatuses) setEditedStatuses(JSON.parse(savedStatuses));
      else setEditedStatuses({});

      const dropoutKey = `thoothukudi_dropout_reasons_${selectedMonth}`;
      const savedReasons = localStorage.getItem(dropoutKey);
      if (savedReasons) setEditedDropoutReasons(JSON.parse(savedReasons));
      else setEditedDropoutReasons({});

      const counsellingKey = `thoothukudi_counselling_${selectedMonth}`;
      const savedCounselling = localStorage.getItem(counsellingKey);
      if (savedCounselling) setEditedCounselling(JSON.parse(savedCounselling));
      else setEditedCounselling({});

      const remarksKey = `thoothukudi_remarks_${selectedMonth}`;
      const savedRemarks = localStorage.getItem(remarksKey);
      if (savedRemarks) setEditedRemarks(JSON.parse(savedRemarks));
      else setEditedRemarks({});
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

      if (fetchedData.credentials) {
        setDeptCredentials(fetchedData.credentials);
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
    setStatusSaveNotice(`Present Status updated`);
    setTimeout(() => setStatusSaveNotice(null), 2500);
  };

  // Handle editing of Dropout Reason by department officials
  const handleDropoutReasonChange = (studentKey: string, newReason: string) => {
    const updated = { ...editedDropoutReasons, [studentKey]: newReason };
    setEditedDropoutReasons(updated);
    try {
      const storageKey = `thoothukudi_dropout_reasons_${selectedMonth}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
    setStatusSaveNotice(`Dropout Reason saved`);
    setTimeout(() => setStatusSaveNotice(null), 2500);
  };

  // Handle editing of Counselling Needed (Yes / No) by department officials
  const handleCounsellingChange = (studentKey: string, newCounselling: string) => {
    const updated = { ...editedCounselling, [studentKey]: newCounselling };
    setEditedCounselling(updated);
    try {
      const storageKey = `thoothukudi_counselling_${selectedMonth}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
    setStatusSaveNotice(`Counselling status updated (${newCounselling})`);
    setTimeout(() => setStatusSaveNotice(null), 2500);
  };

  // Handle editing of Remarks by department officials
  const handleRemarksChange = (studentKey: string, newRemarks: string) => {
    const updated = { ...editedRemarks, [studentKey]: newRemarks };
    setEditedRemarks(updated);
    try {
      const storageKey = `thoothukudi_remarks_${selectedMonth}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
    setStatusSaveNotice(`Remarks saved`);
    setTimeout(() => setStatusSaveNotice(null), 2500);
  };

  // Merge loaded students with department official edits (Status, Dropout Reason, Counselling, Remarks)
  const getMergedStudents = (studentsList: StudentRecord[] = []): StudentRecord[] => {
    return studentsList.map(st => {
      const key = st.emisId || String(st.sNo);
      const customStatus = editedStatuses[key] !== undefined ? editedStatuses[key] : st.status;
      const customDropoutReason = editedDropoutReasons[key] !== undefined ? editedDropoutReasons[key] : st.dropoutReason;
      const customCounselling = editedCounselling[key] !== undefined 
        ? editedCounselling[key] 
        : (st.counsellingRequired || (st.isCounsellingNeeded ? 'Yes' : 'No'));
      const customRemarks = editedRemarks[key] !== undefined ? editedRemarks[key] : st.remarks;

      const lower = (customStatus || '').toLowerCase();
      const isReEnrolled = lower.includes('re-enroll') || lower.includes('reenroll') || lower.includes('readmit');
      const isMigrated = lower.includes('migrat');
      const isStatusNotUpdated = lower === 'status not updated' || lower === 'not updated' || !customStatus.trim();
      const isCounsellingNeeded = (customCounselling || '').toLowerCase().trim() === 'yes';

      return {
        ...st,
        status: customStatus,
        dropoutReason: customDropoutReason,
        counsellingRequired: customCounselling,
        isCounsellingNeeded,
        remarks: customRemarks,
        isReEnrolled,
        isMigrated,
        isStatusNotUpdated,
      };
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

  // Computed class breakdown with total, boys and girls count for each class
  const computedClassStats = (charts.classWise || []).map((entry: any) => {
    const className = entry.name;
    const stdNum = className.replace('Class ', '').trim();
    const classStudents = allStudents.filter(s => {
      const sStd = (s.std || '').trim();
      return sStd === stdNum || `Class ${sStd}` === className || sStd.toLowerCase() === className.toLowerCase();
    });

    let boys = 0;
    let girls = 0;
    classStudents.forEach(s => {
      const g = (s.gender || '').toLowerCase().trim();
      if (g === 'male' || g === 'boy' || g === 'm' || g.startsWith('m')) {
        boys++;
      } else if (g === 'female' || g === 'girl' || g === 'f' || g.startsWith('f')) {
        girls++;
      }
    });

    return {
      name: className,
      total: entry.value ?? classStudents.length,
      boys,
      girls,
      sortOrder: entry.sortOrder || 99,
    };
  }).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

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

  // Custom Chart Tooltip (displays Total, Boys, and Girls count for class-wise bars)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const itemName = label || payload[0]?.name || '';
      const matchedClass = computedClassStats.find(c => c.name === itemName);

      return (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1">
          <div className="font-semibold text-slate-200">{itemName}</div>
          <div className="font-bold text-teal-300 text-sm">
            {payload[0].value} Potential Dropouts
          </div>
          {matchedClass && (
            <div className="pt-1.5 border-t border-slate-700 flex items-center gap-3 text-xs font-bold">
              <span className="text-blue-300">Boys: {matchedClass.boys}</span>
              <span className="text-slate-500">•</span>
              <span className="text-pink-300">Girls: {matchedClass.girls}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border-2 border-slate-300 shadow-xl max-w-sm w-full text-center space-y-4">
          <div className="flex items-center justify-center mx-auto">
            <TamilNaduLogo className="w-16 h-16 shadow-lg" size={64} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Connecting to Live Dashboard
          </h2>
          <p className="text-xs text-slate-600">
            Fetching verified dropout records from Thoothukudi District sheet...
          </p>
          <div className="flex justify-center pt-2">
            <RefreshCw className="w-5 h-5 text-slate-700 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-rose-50 p-8 rounded-2xl border-2 border-rose-300 shadow-xl max-w-md w-full text-center space-y-3">
          <div className="flex justify-center">
            <TamilNaduLogo className="w-14 h-14" size={56} />
          </div>
          <h2 className="text-lg font-bold text-rose-950">
            Connection Error
          </h2>
          <p className="text-xs text-rose-800">{error}</p>
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
    <div className="min-h-screen relative overflow-x-hidden bg-slate-100/90 text-slate-800 flex flex-col">
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
      <header className="bg-white/95 backdrop-blur-md border-b-2 border-slate-300 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          
          {/* Dashboard Title with Official Tamil Nadu Logo */}
          <div className="flex items-center gap-3.5">
            <TamilNaduLogo className="w-12 h-12 sm:w-14 sm:h-14 shadow-md" size={56} />
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Thoothukudi District - Potential Dropout Dashboard
              </h1>
              <p className="text-sm sm:text-base text-slate-700 font-bold">
                District Administration, Thoothukudi
              </p>
            </div>
          </div>

          {/* Right Header Controls: Month Filter (BIG SIZE as requested) + Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            {/* BIG SIZE Month Filter */}
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border-2 border-slate-300 shadow-xs hover:border-slate-400 transition-colors">
              <Calendar className="w-5 h-5 text-slate-800 shrink-0" />
              <label htmlFor="month-select" className="text-xs font-black text-slate-800 uppercase tracking-wider">
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
                className="text-base sm:text-lg font-black text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
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
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:translate-y-0.5 ${
                refreshing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-white' : 'text-white'}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Layout: Left Navigation Sidebar + Dynamic Workspace */}
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col md:flex-row p-4 sm:p-6 gap-6 relative z-10">
        
        {/* Left Sidebar — Month name in big font replacing the word 'department slicers' */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-slate-50/90 border-2 border-slate-300 rounded-2xl p-3.5 shadow-sm sticky top-20">
            {/* Top of sidebar: Month Name in Big Font (Replacing 'department slicers') */}
            <div className="px-3 py-2.5 mb-3 border-b-2 border-slate-300 bg-white rounded-xl shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-800 shrink-0" />
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {selectedMonth}
                </span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                Active
              </span>
            </div>

            <nav className="grid grid-cols-1 gap-1.5">
              {SLICERS.map((slicer) => {
                const isSelected = selectedSlicer === slicer;
                const meta = DEPT_META[slicer] || DEPT_META['Overview'];
                const IconComponent = meta.icon;
                const isLineDept = slicer !== 'Overview' && slicer !== 'Division' && slicer !== 'Line Department Overview' && slicer !== 'Counselling';
                const isAuthed = !!authenticatedDepts[slicer];

                return (
                  <button
                    key={slicer}
                    onClick={() => setSelectedSlicer(slicer)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-md border-2 border-slate-800'
                        : 'bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-950 border-2 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="tracking-tight truncate">{slicer}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {isLineDept && (
                        isAuthed ? (
                          <span
                            title="Session Authenticated"
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              isSelected
                                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <Unlock className="w-2.5 h-2.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span
                            title="Password Protected"
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              isSelected
                                ? 'bg-white/10 text-slate-300 border border-white/20'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            <Lock className="w-2.5 h-2.5" />
                          </span>
                        )
                      )}
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isSelected ? 'text-white translate-x-0.5' : 'text-slate-400 opacity-60'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 min-w-0">
          
          {/* ======================================================== */}
          {/* 1. OVERVIEW VIEW (FORMERLY COMMON DASHBOARD) */}
          {/* ======================================================== */}
          {selectedSlicer === 'Overview' && (
            <div className="space-y-6">
              
              {/* Top Row — 5 Prominent Uniform Summary Cards with Colorful Professional Border and Matching Styling */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Box 1: Potential Dropout */}
                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                      Potential Dropout
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-blue-950 mt-2.5 tracking-tight font-mono">
                    {summary.potentialDropout}
                  </div>
                  <div className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold pt-2.5 border-t-2 border-blue-100 flex justify-between">
                    <span>Identified Students</span>
                    <span className="font-black text-blue-950">100%</span>
                  </div>
                </div>

                {/* Box 2: Re - Enrolled */}
                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                      Re - Enrolled
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-blue-950 mt-2.5 tracking-tight font-mono">
                    {summary.reEnrolled}
                  </div>
                  <div className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold pt-2.5 border-t-2 border-blue-100 flex justify-between">
                    <span>Re-enrolled in School</span>
                    <span className="font-black text-blue-950">
                      {summary.potentialDropout > 0 ? ((summary.reEnrolled / summary.potentialDropout) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>

                {/* Box 3: Migrated */}
                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                      Migrated
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                      <MapPin className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-blue-950 mt-2.5 tracking-tight font-mono">
                    {summary.migrated}
                  </div>
                  <div className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold pt-2.5 border-t-2 border-blue-100 flex justify-between">
                    <span>Relocated District/Block</span>
                    <span className="font-black text-blue-950">
                      {summary.potentialDropout > 0 ? ((summary.migrated / summary.potentialDropout) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>

                {/* Box 4: Repeaters */}
                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                      Repeaters
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-blue-950 mt-2.5 tracking-tight font-mono">
                    {summary.repeaters}
                  </div>
                  <div className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold pt-2.5 border-t-2 border-blue-100 flex justify-between">
                    <span>Repeater Students</span>
                    <span className="font-black text-blue-950">
                      {summary.potentialDropout > 0 ? ((summary.repeaters / summary.potentialDropout) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>

                {/* Box 5: Counselling Needed */}
                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                      Counselling Needed
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-blue-950 mt-2.5 tracking-tight font-mono">
                    {summary.counsellingNeeded}
                  </div>
                  <div className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold pt-2.5 border-t-2 border-blue-100 flex justify-between">
                    <span>Requires Counselling</span>
                    <span className="font-black text-blue-950">
                      {summary.potentialDropout > 0 ? ((summary.counsellingNeeded / summary.potentialDropout) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>

              </div>

              {/* Middle Section — Two Bar Charts with Uniform Colorful Professional Styling */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Bar Chart 1: Block-Wise Potential Dropout */}
                <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-700"></div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Block-Wise Potential Dropout
                      </h3>
                    </div>
                    <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs">
                      13 Educational Blocks
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 mb-3 font-bold">
                    Monthly dropout distribution across Thoothukudi District blocks
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
                          tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 700 }}
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={50}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#64748b"
                          tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eff6ff' }} />
                        <Bar
                          dataKey="count"
                          fill="#1d4ed8"
                          radius={[4, 4, 0, 0]}
                          label={{ position: 'top', fill: '#1e3a5f', fontSize: 12, fontWeight: 700 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar Chart 2: Line Department Allocation */}
                <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-700"></div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Line Department-Wise Allocation
                      </h3>
                    </div>
                    <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs">
                      8 Line Departments
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 mb-3 font-bold">
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
                          tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 700 }}
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={50}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#64748b"
                          tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eff6ff' }} />
                        <Bar
                          dataKey="count"
                          fill="#0f766e"
                          radius={[4, 4, 0, 0]}
                          label={{ position: 'top', fill: '#0f766e', fontSize: 12, fontWeight: 700 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Bottom Section — Class-Wise Potential Dropout */}
              <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-700"></div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Class-Wise Potential Dropout
                    </h3>
                  </div>
                  <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs">
                    Class 1 through Class 12
                  </span>
                </div>
                <p className="text-sm sm:text-base text-slate-700 mb-3 font-bold">
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
                        tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 700 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={40}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eff6ff' }} />
                      <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        label={{ position: 'top', fill: '#1e3a5f', fontSize: 12, fontWeight: 700 }}
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
            <div className="bg-white border-2 border-blue-600 rounded-2xl p-6 shadow-sm space-y-6">
              
              {/* Division Section Header with Dropdown in Division page alone */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-blue-100">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                    <Layers className="w-6 h-6 text-blue-700" />
                    <span>Division Overview — Thoothukudi District</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-700 font-bold mt-1">
                    Educational Divisions performance &amp; block breakdown for {selectedMonth}
                  </p>
                </div>

                {/* Division Dropdown (in division page alone as requested) */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border-2 border-blue-400 shadow-xs hover:border-blue-500 transition-colors">
                    <Filter className="w-4 h-4 text-blue-700 shrink-0" />
                    <label htmlFor="division-page-filter" className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Division:
                    </label>
                    <select
                      id="division-page-filter"
                      value={divisionFilter}
                      onChange={(e) => setDivisionFilter(e.target.value)}
                      className="text-sm sm:text-base font-black text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
                      title="Filter Division in Division Page"
                    >
                      <option value="All" className="font-bold text-slate-900 bg-white">All Divisions (One by One)</option>
                      <option value="Kovilpatti" className="font-bold text-slate-900 bg-white">Kovilpatti Division</option>
                      <option value="Thoothukudi" className="font-bold text-slate-900 bg-white">Thoothukudi Division</option>
                      <option value="Tiruchendur" className="font-bold text-slate-900 bg-white">Tiruchendur Division</option>
                    </select>
                  </div>
                  <span className="text-sm font-black px-4 py-2.5 rounded-xl bg-blue-50 text-blue-900 border-2 border-blue-400 shadow-2xs">
                    {divisionFilter === 'All' ? '3 Divisions' : `${divisionFilter} Division`}
                  </span>
                </div>
              </div>

              {/* Single Column Grid: Divisions shown one by one below with abundant horizontal space */}
              <div className="flex flex-col gap-8">
                {computedDivisions
                  .filter(div => divisionFilter === 'All' || div.name.toLowerCase() === divisionFilter.toLowerCase())
                  .map((div) => {
                    return (
                      <div
                        key={div.name}
                        className="bg-white border-2 border-blue-600 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all text-slate-800 space-y-6"
                      >
                        {/* Division Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-blue-100">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                              <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                {div.name} Division
                              </h3>
                              <p className="text-sm sm:text-base text-slate-700 font-bold mt-0.5">
                                Jurisdiction Blocks: {div.blocks.map(b => b.name).join(', ')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="px-4 py-2 rounded-xl text-sm sm:text-base font-black text-blue-900 bg-blue-50 border border-blue-300 shadow-2xs">
                              {div.totalStudents} Potential Dropouts
                            </span>
                            <span className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white border border-blue-300 shadow-2xs">
                              {div.blocks.length} Blocks
                            </span>
                          </div>
                        </div>

                        {/* 4 Spacious Summary Boxes across the full single-column width */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                            <span className="text-sm font-black text-slate-900 uppercase block tracking-wider">
                              Potential Dropouts
                            </span>
                            <span className="text-3xl sm:text-4xl font-black text-blue-950 mt-2 block tracking-tight font-mono">
                              {div.totalStudents}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-700 font-bold mt-1 block">
                              Total Identified
                            </span>
                          </div>

                          <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                            <span className="text-sm font-black text-slate-900 uppercase block tracking-wider">
                              Repeaters (Col N)
                            </span>
                            <span className="text-3xl sm:text-4xl font-black text-blue-950 mt-2 block tracking-tight font-mono">
                              {div.repeaters}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-700 font-bold mt-1 block">
                              {div.totalStudents > 0 ? ((div.repeaters / div.totalStudents) * 100).toFixed(0) : 0}% of Division
                            </span>
                          </div>

                          <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                            <span className="text-sm font-black text-slate-900 uppercase block tracking-wider">
                              Re-Enrolled (Col R)
                            </span>
                            <span className="text-3xl sm:text-4xl font-black text-blue-950 mt-2 block tracking-tight font-mono">
                              {div.reEnrolled}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-700 font-bold mt-1 block">
                              {div.totalStudents > 0 ? ((div.reEnrolled / div.totalStudents) * 100).toFixed(0) : 0}% Re-admitted
                            </span>
                          </div>

                          <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                            <span className="text-sm font-black text-slate-900 uppercase block tracking-wider">
                              Counselling Needed (Col Q)
                            </span>
                            <span className="text-3xl sm:text-4xl font-black text-blue-950 mt-2 block tracking-tight font-mono">
                              {div.counsellingNeeded}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-700 font-bold mt-1 block">
                              {div.totalStudents > 0 ? ((div.counsellingNeeded / div.totalStudents) * 100).toFixed(0) : 0}% Need Support
                            </span>
                          </div>
                        </div>

                        {/* Full Width Block Breakdown Table */}
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-black text-slate-900 tracking-tight">
                              Educational Block-Wise Breakdown — {div.name} Division
                            </h4>
                            <span className="text-xs sm:text-sm font-bold text-slate-700">
                              Data from Sheet Columns B, N, Q, R
                            </span>
                          </div>

                          <div className="overflow-x-auto rounded-xl border-2 border-blue-600 bg-white shadow-2xs">
                            <table className="w-full text-left text-sm min-w-[720px]">
                              <thead className="bg-blue-600 text-white font-black">
                                <tr>
                                  <th className="py-3.5 px-4 sm:px-6 whitespace-nowrap">Educational Block</th>
                                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Potential Dropouts</th>
                                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Repeaters (Col N)</th>
                                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Re-Enrolled (Col R)</th>
                                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Counselling Needed (Col Q)</th>
                                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Division Share</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                                {div.blocks.map((b) => {
                                  const pct = div.totalStudents > 0 ? ((b.count / div.totalStudents) * 100).toFixed(1) : '0';
                                  return (
                                    <tr key={b.name} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="py-3.5 px-4 sm:px-6 font-black text-slate-900 text-base whitespace-nowrap">
                                        {b.name}
                                      </td>
                                      <td className="py-3.5 px-4 text-center font-black text-slate-900 text-base whitespace-nowrap">
                                        {b.count}
                                      </td>
                                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <span className="px-3 py-1 rounded-md bg-purple-100 text-purple-950 font-black text-xs border border-purple-300">
                                          {b.repeaters}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <span className="px-3 py-1 rounded-md bg-emerald-100 text-emerald-950 font-black text-xs border border-emerald-300">
                                          {b.reEnrolled}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <span className="px-3 py-1 rounded-md bg-rose-100 text-rose-950 font-black text-xs border border-rose-300">
                                          {b.counsellingNeeded}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 whitespace-nowrap">
                                        {pct}%
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                                <tr>
                                  <td className="py-3 px-4 sm:px-6 text-sm whitespace-nowrap">
                                    Total ({div.name} Division)
                                  </td>
                                  <td className="py-3 px-4 text-center font-black text-base whitespace-nowrap">
                                    {div.totalStudents}
                                  </td>
                                  <td className="py-3 px-4 text-center font-black text-base text-purple-950 whitespace-nowrap">
                                    {div.repeaters}
                                  </td>
                                  <td className="py-3 px-4 text-center font-black text-base text-emerald-950 whitespace-nowrap">
                                    {div.reEnrolled}
                                  </td>
                                  <td className="py-3 px-4 text-center font-black text-base text-rose-950 whitespace-nowrap">
                                    {div.counsellingNeeded}
                                  </td>
                                  <td className="py-3 px-4 text-center font-black text-slate-900 whitespace-nowrap">
                                    100%
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
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
                  <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <Users className="w-5 h-5 text-slate-800" />
                          <span>Division Student Records ({filteredDivStudents.length})</span>
                        </h3>
                        <p className="text-sm text-slate-700 font-medium">
                          Records across Kovilpatti, Thoothukudi, and Tiruchendur
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {/* Division Filter Buttons */}
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-300">
                          {['All', 'Kovilpatti', 'Thoothukudi', 'Tiruchendur'].map((df) => (
                            <button
                              key={df}
                              onClick={() => setDivisionFilter(df)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                divisionFilter === df
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'text-slate-700 hover:text-slate-900'
                              }`}
                            >
                              {df}
                            </button>
                          ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                          <input
                            type="text"
                            placeholder="Search name, block, EMIS..."
                            value={divisionSearch}
                            onChange={(e) => setDivisionSearch(e.target.value)}
                            className="text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 w-full sm:w-60 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border-2 border-slate-300 max-h-96 overflow-y-auto bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-300 sticky top-0 z-10">
                          <tr>
                            <th className="py-3 px-3.5">S.No</th>
                            <th className="py-3 px-3.5">Student Name</th>
                            <th className="py-3 px-3.5">EMIS ID</th>
                            <th className="py-3 px-3.5">Division</th>
                            <th className="py-3 px-3.5">Block</th>
                            <th className="py-3 px-3.5">Class</th>
                            <th className="py-3 px-3.5">School</th>
                            <th className="py-3 px-3.5">Repeaters</th>
                            <th className="py-3 px-3.5">Present Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                          {filteredDivStudents.slice(0, 100).map((st, idx) => (
                            <tr key={st.emisId ? `div-st-${st.emisId}-${idx}` : `div-st-${st.sNo}-${idx}`} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3.5 font-bold text-slate-600">{st.sNo}</td>
                              <td className="py-2.5 px-3.5 font-black text-slate-900">{st.studentName}</td>
                              <td className="py-2.5 px-3.5 text-slate-700 font-bold">{st.emisId || '-'}</td>
                              <td className="py-2.5 px-3.5 font-bold text-slate-800">{st.division}</td>
                              <td className="py-2.5 px-3.5 font-bold text-slate-800">{st.block}</td>
                              <td className="py-2.5 px-3.5">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300">
                                  Std {st.std} {st.sec ? `(${st.sec})` : ''}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 text-slate-700 max-w-xs truncate">{st.school}</td>
                              <td className="py-2.5 px-3.5">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  st.isRepeater
                                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                }`}>
                                  {st.repeaterStatus}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  st.isReEnrolled
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
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
          {/* 3. LINE DEPARTMENT OVERVIEW (FORMERLY ALL LINE DEPARTMENT) */}
          {/* ======================================================== */}
          {selectedSlicer === 'Line Department Overview' && (
            <div className="space-y-6">
              
              {/* Header and Download Controls */}
              <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Layers className="w-6 h-6 text-blue-700" />
                    <span>Line Department Overview</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-700 font-bold mt-0.5">
                    Consolidated cross-department abstract for {selectedMonth} across Thoothukudi District
                  </p>
                </div>

                {/* Export Options for Line Department Overview Abstract (Excel and Word only) */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => exportAbstractToExcel(computedDepartments, `Line_Department_Overview_${selectedMonth}`)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs border border-emerald-800 transition-all active:scale-95 cursor-pointer"
                    title="Download Excel format"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => exportStudentsToWord(allStudents, `Thoothukudi_All_Departments_Students_${selectedMonth}`)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs border border-blue-800 transition-all active:scale-95 cursor-pointer"
                    title="Download Word format"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Word (.doc)</span>
                  </button>
                </div>
              </div>

              {/* 6 Summary Metric Cards across all line departments with uniform colorful professional styling */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 text-center shadow-sm">
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase block tracking-wider">Total Dropouts</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-950 font-mono mt-1.5 block">
                    {computedDepartments.reduce((acc, d) => acc + d.potentialDropout, 0)}
                  </span>
                </div>

                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 text-center shadow-sm">
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase block tracking-wider">Repeaters</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-950 font-mono mt-1.5 block">
                    {computedDepartments.reduce((acc, d) => acc + d.repeaters, 0)}
                  </span>
                </div>

                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 text-center shadow-sm">
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase block tracking-wider">Re-Enrolled</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-950 font-mono mt-1.5 block">
                    {computedDepartments.reduce((acc, d) => acc + d.reEnrolled, 0)}
                  </span>
                </div>

                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 text-center shadow-sm">
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase block tracking-wider">Counselling Needed</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-950 font-mono mt-1.5 block">
                    {computedDepartments.reduce((acc, d) => acc + d.counsellingNeeded, 0)}
                  </span>
                </div>

                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 text-center shadow-sm">
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase block tracking-wider">Status Not Updated</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-950 font-mono mt-1.5 block">
                    {computedDepartments.reduce((acc, d) => acc + d.statusNotUpdated, 0)}
                  </span>
                </div>

                <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 text-center shadow-sm">
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase block tracking-wider">Migrated</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-950 font-mono mt-1.5 block">
                    {computedDepartments.reduce((acc, d) => acc + d.migrated, 0)}
                  </span>
                </div>
              </div>

              {/* Comprehensive Abstract Table */}
              <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Department-Wise Abstract Comparison
                    </h3>
                    <p className="text-sm sm:text-base text-slate-700 font-bold mt-0.5">
                      Total potential dropouts, repeaters, re-enrolled, counselling needed, status not updated &amp; migrated
                    </p>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search department..."
                      value={abstractSearch}
                      onChange={(e) => setAbstractSearch(e.target.value)}
                      className="text-sm pl-9 pr-3 py-2 rounded-xl border-2 border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-64 font-bold"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border-2 border-blue-600 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-blue-600 text-white font-black">
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
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {computedDepartments
                        .filter(d => !abstractSearch || d.name.toLowerCase().includes(abstractSearch.toLowerCase()))
                        .map((dept) => {
                          const meta = DEPT_META[dept.name] || DEPT_META['Overview'];
                          const IconComponent = meta.icon;

                          return (
                            <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-4 font-black text-slate-900">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shadow-2xs">
                                    <IconComponent className="w-4 h-4" />
                                  </div>
                                  <span className="text-sm font-bold">{dept.name}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center font-black text-slate-900 text-base">
                                {dept.potentialDropout}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-950 font-bold text-xs border border-purple-200">
                                  {dept.repeaters}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-950 font-bold text-xs border border-emerald-200">
                                  {dept.reEnrolled}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-950 font-bold text-xs border border-rose-200">
                                  {dept.counsellingNeeded}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-900 font-bold text-xs border border-slate-200">
                                  {dept.statusNotUpdated}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-950 font-bold text-xs border border-amber-200">
                                  {dept.migrated}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => setSelectedSlicer(dept.name as SlicerType)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-black px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors bg-white shadow-2xs"
                                >
                                  <span>Open</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                      <tr>
                        <td className="py-3 px-4 text-sm">Total Across All Departments</td>
                        <td className="py-3 px-4 text-center font-black text-base">
                          {computedDepartments.reduce((acc, d) => acc + d.potentialDropout, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-base text-purple-950">
                          {computedDepartments.reduce((acc, d) => acc + d.repeaters, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-base text-emerald-950">
                          {computedDepartments.reduce((acc, d) => acc + d.reEnrolled, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-base text-rose-950">
                          {computedDepartments.reduce((acc, d) => acc + d.counsellingNeeded, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-base text-slate-900">
                          {computedDepartments.reduce((acc, d) => acc + d.statusNotUpdated, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-base text-amber-950">
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
          {/* 3B. COUNSELLING SLICER VIEW (ALL DEPARTMENTS WHERE COUNSELLING = YES) */}
          {/* ======================================================== */}
          {selectedSlicer === 'Counselling' && (() => {
            // Helper to check if counselling is Yes (from sheet data or live edits)
            const isCounsellingYesStudent = (student: StudentRecord): boolean => {
              const key = student.emisId || String(student.sNo);
              if (editedCounselling[key] !== undefined && editedCounselling[key] !== '') {
                const val = editedCounselling[key].trim().toLowerCase();
                return val === 'yes' || val === 'required' || val.includes('yes');
              }
              const cReq = (student.counsellingRequired || '').trim().toLowerCase();
              return student.isCounsellingNeeded || cReq === 'yes' || cReq === 'required' || cReq.includes('yes');
            };

            const allCounsellingStudents = allStudents.filter(isCounsellingYesStudent);

            // Department-wise distribution for all 8 line departments
            const deptBreakdown = [
              'Health Department',
              'Labour Department',
              'DCPO',
              'Social Welfare',
              'Fisheries Department',
              'Revenue Department',
              'DDRO',
              'DSE'
            ].map(deptName => {
              const deptStudents = allCounsellingStudents.filter(s => s.lineDept.toLowerCase() === deptName.toLowerCase());
              const boys = deptStudents.filter(s => {
                const g = (s.gender || '').toLowerCase().trim();
                return g === 'male' || g === 'boy' || g === 'm' || g.startsWith('m');
              }).length;
              const girls = deptStudents.filter(s => {
                const g = (s.gender || '').toLowerCase().trim();
                return g === 'female' || g === 'girl' || g === 'f' || g.startsWith('f');
              }).length;
              const reEnrolled = deptStudents.filter(s => s.isReEnrolled).length;

              return {
                name: deptName,
                total: deptStudents.length,
                boys,
                girls,
                reEnrolled,
                students: deptStudents,
              };
            }).sort((a, b) => b.total - a.total);

            // Filtered students according to search, department, and gender
            const filteredCounsellingStudents = allCounsellingStudents.filter(s => {
              const matchDept = counsellingDeptFilter === 'All' || s.lineDept.toLowerCase() === counsellingDeptFilter.toLowerCase();
              
              let matchGender = true;
              const g = (s.gender || '').toLowerCase().trim();
              if (counsellingGenderFilter === 'Boys') {
                matchGender = g === 'male' || g === 'boy' || g === 'm' || g.startsWith('m');
              } else if (counsellingGenderFilter === 'Girls') {
                matchGender = g === 'female' || g === 'girl' || g === 'f' || g.startsWith('f');
              }

              const q = counsellingSearch.toLowerCase().trim();
              const matchSearch = !q || 
                (s.studentName || '').toLowerCase().includes(q) ||
                (s.emisId || '').toLowerCase().includes(q) ||
                (s.school || '').toLowerCase().includes(q) ||
                (s.block || '').toLowerCase().includes(q) ||
                (s.taluk || '').toLowerCase().includes(q) ||
                (s.lineDept || '').toLowerCase().includes(q) ||
                (s.dropoutReason || '').toLowerCase().includes(q) ||
                (s.status || '').toLowerCase().includes(q) ||
                (s.contactNo || '').toLowerCase().includes(q);

              return matchDept && matchGender && matchSearch;
            });

            const totalBoys = allCounsellingStudents.filter(s => {
              const g = (s.gender || '').toLowerCase().trim();
              return g === 'male' || g === 'boy' || g === 'm' || g.startsWith('m');
            }).length;

            const totalGirls = allCounsellingStudents.filter(s => {
              const g = (s.gender || '').toLowerCase().trim();
              return g === 'female' || g === 'girl' || g === 'f' || g.startsWith('f');
            }).length;

            const totalReEnrolledCounselling = allCounsellingStudents.filter(s => s.isReEnrolled).length;
            const deptsWithCounselling = deptBreakdown.filter(d => d.total > 0).length;

            return (
              <div className="space-y-6">
                
                {/* Header & Export Controls */}
                <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-md">
                      <HeartPulse className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Department Counselling Interventions
                      </h2>
                      <p className="text-sm sm:text-base text-slate-700 font-bold mt-0.5">
                        Consolidated data of all departments where counselling is marked 'Yes' for {selectedMonth}
                      </p>
                    </div>
                  </div>

                  {/* Export Options */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => exportStudentsToExcel(filteredCounsellingStudents, `Thoothukudi_Counselling_Yes_${selectedMonth}`)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs border border-emerald-800 transition-all active:scale-95 cursor-pointer"
                      title="Download Excel format"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Export Excel (.xlsx)</span>
                    </button>

                    <button
                      onClick={() => exportStudentsToWord(filteredCounsellingStudents, `Thoothukudi Counselling Yes Students - All Departments (${selectedMonth})`)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs border border-blue-800 transition-all active:scale-95 cursor-pointer"
                      title="Download Word format"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Export Word (.doc)</span>
                    </button>
                  </div>
                </div>

                {/* 5 Uniform Top Summary KPI Boxes with Colorful Professional Border */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  
                  {/* KPI 1: Total Counselling Cases */}
                  <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                        Total Counselling
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                        <HeartPulse className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-blue-950 mt-2.5 tracking-tight font-mono">
                      {allCounsellingStudents.length}
                    </div>
                    <div className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold pt-2.5 border-t-2 border-blue-100 flex justify-between">
                      <span>Counselling = 'Yes'</span>
                      <span className="font-black text-blue-950">All Depts</span>
                    </div>
                  </div>

                  {/* KPI 2: Departments Reporting */}
                  <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                        Line Depts Active
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                        <Building2 className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-blue-950 mt-2.5 tracking-tight font-mono">
                      {deptsWithCounselling} <span className="text-lg font-bold text-slate-600">/ 8</span>
                    </div>
                    <div className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold pt-2.5 border-t-2 border-blue-100 flex justify-between">
                      <span>Reporting Depts</span>
                      <span className="font-black text-blue-950">{((deptsWithCounselling / 8) * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* KPI 3: Boys Count */}
                  <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                        Boys Counselling
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-blue-950 mt-2.5 tracking-tight font-mono">
                      {totalBoys}
                    </div>
                    <div className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold pt-2.5 border-t-2 border-blue-100 flex justify-between">
                      <span>Male Students</span>
                      <span className="font-black text-blue-950">
                        {allCounsellingStudents.length > 0 ? ((totalBoys / allCounsellingStudents.length) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* KPI 4: Girls Count */}
                  <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                        Girls Counselling
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-blue-950 mt-2.5 tracking-tight font-mono">
                      {totalGirls}
                    </div>
                    <div className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold pt-2.5 border-t-2 border-blue-100 flex justify-between">
                      <span>Female Students</span>
                      <span className="font-black text-blue-950">
                        {allCounsellingStudents.length > 0 ? ((totalGirls / allCounsellingStudents.length) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* KPI 5: Re-enrolled among Counselling */}
                  <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                        Re - Enrolled
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-blue-950 mt-2.5 tracking-tight font-mono">
                      {totalReEnrolledCounselling}
                    </div>
                    <div className="mt-2.5 text-xs sm:text-sm text-slate-700 font-bold pt-2.5 border-t-2 border-blue-100 flex justify-between">
                      <span>Rejoined School</span>
                      <span className="font-black text-blue-950">
                        {allCounsellingStudents.length > 0 ? ((totalReEnrolledCounselling / allCounsellingStudents.length) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>

                </div>

                {/* Department-Wise Counselling Distribution Grid */}
                <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-blue-100">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-700" />
                        <span>Department-Wise Counselling Distribution</span>
                      </h3>
                      <p className="text-sm sm:text-base text-slate-700 font-bold mt-0.5">
                        Click any department box to filter the student list below
                      </p>
                    </div>
                    {counsellingDeptFilter !== 'All' && (
                      <button
                        onClick={() => setCounsellingDeptFilter('All')}
                        className="text-xs sm:text-sm font-black px-3 py-1.5 rounded-lg bg-blue-100 text-blue-900 hover:bg-blue-200 transition-colors w-fit"
                      >
                        Clear Department Filter ({counsellingDeptFilter})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    {deptBreakdown.map(dept => {
                      const isDeptSelected = counsellingDeptFilter.toLowerCase() === dept.name.toLowerCase();
                      const meta = DEPT_META[dept.name] || DEPT_META['Overview'];
                      const DeptIcon = meta.icon;

                      return (
                        <div
                          key={dept.name}
                          onClick={() => setCounsellingDeptFilter(isDeptSelected ? 'All' : dept.name)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isDeptSelected
                              ? 'bg-blue-50/90 border-blue-700 shadow-md ring-2 ring-blue-400'
                              : 'bg-white hover:bg-blue-50/40 border-blue-600 shadow-xs'
                          }`}
                          title={`Click to filter by ${dept.name}`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                                  <DeptIcon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-black text-slate-900 truncate">
                                  {dept.name}
                                </span>
                              </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-blue-950 font-mono">
                              {dept.total} <span className="text-sm font-bold text-slate-600">Cases</span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>Boys: <strong className="text-blue-900 font-black">{dept.boys}</strong></span>
                            <span>•</span>
                            <span>Girls: <strong className="text-pink-700 font-black">{dept.girls}</strong></span>
                            <span>•</span>
                            <span>Re-enrolled: <strong className="text-emerald-700 font-black">{dept.reEnrolled}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Filterable Student Records Table */}
                <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b-2 border-blue-100">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-700" />
                        <span>Counselling Student Records ({filteredCounsellingStudents.length})</span>
                      </h3>
                      <p className="text-sm sm:text-base text-slate-700 font-bold mt-0.5">
                        Students across all departments requiring counselling intervention
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Department Filter Dropdown */}
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border-2 border-blue-400">
                        <Filter className="w-4 h-4 text-blue-700" />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Dept:</span>
                        <select
                          value={counsellingDeptFilter}
                          onChange={(e) => setCounsellingDeptFilter(e.target.value)}
                          className="text-sm font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                        >
                          <option value="All">All Departments</option>
                          {deptBreakdown.map(d => (
                            <option key={d.name} value={d.name}>{d.name} ({d.total})</option>
                          ))}
                        </select>
                      </div>

                      {/* Gender Filter Dropdown */}
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border-2 border-blue-400">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Gender:</span>
                        <select
                          value={counsellingGenderFilter}
                          onChange={(e) => setCounsellingGenderFilter(e.target.value)}
                          className="text-sm font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                        >
                          <option value="All">All Genders</option>
                          <option value="Boys">Boys Only</option>
                          <option value="Girls">Girls Only</option>
                        </select>
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Search student, EMIS, school..."
                          value={counsellingSearch}
                          onChange={(e) => setCounsellingSearch(e.target.value)}
                          className="text-sm pl-9 pr-3 py-2 rounded-xl border-2 border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-64 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Student Records Table */}
                  <div className="overflow-x-auto rounded-xl border-2 border-blue-600 max-h-[550px] overflow-y-auto bg-white">
                    <table className="w-full text-left">
                      <thead className="bg-blue-600 text-white font-black sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="py-3 px-3.5 whitespace-nowrap">S.No</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">Student Name</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">EMIS ID</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">Department</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">Class & Sec</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">Gender</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">School Name</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">Block / Taluk</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">Contact No</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">Dropout Reason</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">Counselling</th>
                          <th className="py-3 px-3.5 whitespace-nowrap">Present Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100 font-semibold text-slate-800">
                        {filteredCounsellingStudents.length === 0 ? (
                          <tr>
                            <td colSpan={12} className="py-12 text-center text-slate-500 font-bold">
                              No counselling records found matching the current filters.
                            </td>
                          </tr>
                        ) : (
                          filteredCounsellingStudents.map((st, idx) => {
                            const studentKey = st.emisId || String(st.sNo);
                            const isGirl = (st.gender || '').toLowerCase().trim() === 'female' || (st.gender || '').toLowerCase().trim() === 'girl' || (st.gender || '').toLowerCase().trim() === 'f';
                            
                            return (
                              <tr key={st.emisId ? `counsel-st-${st.emisId}-${idx}` : `counsel-st-${st.sNo}-${idx}`} className="hover:bg-blue-50/50 transition-colors">
                                <td className="py-3 px-3.5 font-bold text-slate-600">{st.sNo || idx + 1}</td>
                                <td className="py-3 px-3.5 font-black text-slate-900 whitespace-nowrap">{st.studentName}</td>
                                <td className="py-3 px-3.5 font-mono text-slate-700 font-bold">{st.emisId || '-'}</td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 font-black text-xs border border-blue-200">
                                    {st.lineDept}
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-bold text-xs border border-slate-300">
                                    Std {st.std} {st.sec ? `(${st.sec})` : ''}
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-xs font-black ${
                                    isGirl 
                                      ? 'bg-pink-50 text-pink-900 border border-pink-200' 
                                      : 'bg-blue-50 text-blue-900 border border-blue-200'
                                  }`}>
                                    {isGirl ? 'Girls' : 'Boys'}
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 text-slate-700 max-w-xs truncate" title={st.school}>{st.school}</td>
                                <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 font-bold">
                                  {st.block} {st.taluk ? `• ${st.taluk}` : ''}
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-700 font-bold">
                                  {st.contactNo ? (
                                    <a href={`tel:${st.contactNo}`} className="text-blue-700 hover:underline">
                                      {st.contactNo}
                                    </a>
                                  ) : '-'}
                                </td>
                                <td className="py-3 px-3.5 text-slate-700 max-w-xs truncate" title={st.dropoutReason || 'Not Specified'}>
                                  {st.dropoutReason || 'Not Specified'}
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-900 border border-rose-300 flex items-center gap-1 w-fit">
                                    <HeartPulse className="w-3 h-3 text-rose-600" />
                                    <span>Yes</span>
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                    st.isReEnrolled
                                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                                      : st.isMigrated
                                      ? 'bg-amber-50 text-amber-900 border border-amber-300'
                                      : 'bg-blue-50 text-blue-900 border border-blue-300'
                                  }`}>
                                    {st.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* 4. REVENUE DEPARTMENT (TALUK-WISE SOURCED FROM COL C) */}
          {/* ======================================================== */}
          {selectedSlicer === 'Revenue Department' && (
            !authenticatedDepts['Revenue Department'] ? (
              <DepartmentLoginForm
                departmentName="Revenue Department"
                credentials={deptCredentials['Revenue Department'] || DEFAULT_DEPARTMENT_CREDENTIALS['Revenue Department']}
                departmentMeta={DEPT_META['Revenue Department']}
                onLoginSuccess={(userId) => handleDepartmentLoginSuccess('Revenue Department', userId)}
                onCancel={() => setSelectedSlicer('Line Department Overview')}
              />
            ) : (
            <div className="space-y-6">
              
              {/* Authorized Department Session Banner */}
              <div className="bg-teal-50 border-2 border-teal-300 rounded-2xl p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-teal-950 uppercase tracking-wider block">
                      Authorized Department Session
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-teal-900">
                      Logged in as: <span className="font-mono font-black">{deptCredentials['Revenue Department']?.userId || 'revenue_dept'}</span> • Revenue Department
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDepartmentLogout('Revenue Department')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 shadow-2xs transition-colors cursor-pointer"
                  title="Lock Revenue Department and logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Lock / Logout</span>
                </button>
              </div>

              {/* Header and Download Controls */}
              <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Landmark className="w-6 h-6 text-blue-700" />
                    <span>Revenue Department — Taluk-Wise Dashboard</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-700 font-bold mt-0.5">
                    Taluk-wise monitoring across Thoothukudi District for {selectedMonth}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => exportStudentsToExcel(revenueStudents, `Revenue_Department_Students_${selectedMonth}`)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs border border-emerald-800 transition-all active:scale-95 cursor-pointer"
                    title="Download Excel format"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => exportStudentsToWord(revenueStudents, `Revenue_Department_Students_${selectedMonth}`)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs border border-blue-800 transition-all active:scale-95 cursor-pointer"
                    title="Download Word format"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Word (.doc)</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Boxes for Revenue Department with uniform colorful professional styling */}
              {(() => {
                const repCount = revenueStudents.filter(s => s.isRepeater).length;
                const reEnrCount = revenueStudents.filter(s => s.isReEnrolled).length;
                const counselCount = revenueStudents.filter(s => s.isCounsellingNeeded).length;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wider block">
                        Potential Dropout
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-blue-950 font-mono mt-2">
                        {revenueStudents.length}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-700 mt-1.5 font-bold pt-2 border-t border-blue-100">
                        Revenue Department Caseload
                      </div>
                    </div>

                    <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wider block">
                        Re-Enrolled
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-blue-950 font-mono mt-2">
                        {reEnrCount}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-700 mt-1.5 font-bold pt-2 border-t border-blue-100">
                        Re-enrolled in School
                      </div>
                    </div>

                    <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wider block">
                        Repeaters
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-blue-950 font-mono mt-2">
                        {repCount}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-700 mt-1.5 font-bold pt-2 border-t border-blue-100">
                        Repeaters Caseload
                      </div>
                    </div>

                    <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wider block">
                        Counselling Needed
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-blue-950 font-mono mt-2">
                        {counselCount}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-700 mt-1.5 font-bold pt-2 border-t border-blue-100">
                        Guidance Required
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Taluk-Wise Abstract Cards */}
              <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-teal-800" />
                      <span>Taluk-Wise Distribution (Revenue Department)</span>
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Breakdown across taluks in Thoothukudi District
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-slate-800 border border-slate-300 shadow-2xs">
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
                        className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white hover:bg-teal-50/50 text-slate-800 border-slate-300 hover:border-teal-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black truncate">{taluk.name}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-900 border border-slate-300'
                          }`}>
                            {taluk.potentialDropout}
                          </span>
                        </div>
                        <div className={`mt-2 flex items-center justify-between text-xs font-bold ${
                          isSelected ? 'text-slate-300' : 'text-slate-600'
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
                  <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <Users className="w-5 h-5 text-teal-800" />
                          <span>
                            Taluk Student Records ({filteredTalukStudents.length})
                            {revenueTalukFilter !== 'All' && ` — ${revenueTalukFilter}`}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-600 font-medium">
                          Officials can edit Dropout Reason, Present Status dropdown, and Remarks for each student below. Changes update counts and save automatically.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {revenueTalukFilter !== 'All' && (
                          <button
                            onClick={() => setRevenueTalukFilter('All')}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs"
                          >
                            Reset Taluk Filter
                          </button>
                        )}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Filter name, EMIS, school..."
                            value={revenueSearch}
                            onChange={(e) => setRevenueSearch(e.target.value)}
                            className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 w-full sm:w-56"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Table with ALL Columns and Editable Dropout Reason, Present Status, and Remarks */}
                    <div className="overflow-x-auto rounded-xl border-2 border-slate-300 max-h-[32rem] overflow-y-auto bg-white">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-800 font-black border-b-2 border-slate-300 sticky top-0 z-10">
                          <tr>
                            <th className="py-3 px-3.5">S.No</th>
                            <th className="py-3 px-3.5">Student Name</th>
                            <th className="py-3 px-3.5">EMIS ID</th>
                            <th className="py-3 px-3.5">Taluk</th>
                            <th className="py-3 px-3.5">Division</th>
                            <th className="py-3 px-3.5">Block</th>
                            <th className="py-3 px-3.5">School</th>
                            <th className="py-3 px-3.5">Class</th>
                            <th className="py-3 px-3.5">Gender</th>
                            <th className="py-3 px-3.5">Repeater</th>
                            <th className="py-3 px-3.5 min-w-32 bg-rose-100/70 text-rose-950 font-black border-l border-r border-rose-300">
                              Counselling (Dropdown)
                            </th>
                            <th className="py-3 px-3.5 min-w-56 bg-sky-100/70 text-sky-950 font-black border-l border-r border-sky-300">
                              Dropout Reason (Editable)
                            </th>
                            <th className="py-3 px-3.5 min-w-48 bg-amber-100/70 text-amber-950 font-black border-l border-r border-amber-300">
                              Present Status (Editable Dropdown)
                            </th>
                            <th className="py-3 px-3.5">Contact No</th>
                            <th className="py-3 px-3.5 min-w-56 bg-indigo-100/70 text-indigo-950 font-black border-l border-r border-indigo-300">
                              Remarks (Editable)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                          {filteredTalukStudents.map((st, idx) => {
                            const key = st.emisId || String(st.sNo);
                            const counsellingVal = (st.counsellingRequired === 'Yes' || st.isCounsellingNeeded) ? 'Yes' : 'No';
                            return (
                              <tr key={`rev-${key}-${idx}`} className="hover:bg-teal-50/40 transition-colors">
                                <td className="py-2.5 px-3.5 font-bold text-slate-600">{st.sNo}</td>
                                <td className="py-2.5 px-3.5 font-black text-slate-900">{st.studentName}</td>
                                <td className="py-2.5 px-3.5 text-slate-700 font-bold">{st.emisId || '-'}</td>
                                <td className="py-2.5 px-3.5 font-bold text-teal-900 bg-teal-50/60">{st.taluk}</td>
                                <td className="py-2.5 px-3.5 text-slate-700">{st.division}</td>
                                <td className="py-2.5 px-3.5 font-bold text-slate-800">{st.block}</td>
                                <td className="py-2.5 px-3.5 text-slate-700 max-w-xs truncate">{st.school}</td>
                                <td className="py-2.5 px-3.5 text-slate-800 font-bold">
                                  Std {st.std} {st.sec ? `(${st.sec})` : ''}
                                </td>
                                <td className="py-2.5 px-3.5 text-slate-700">{st.gender}</td>
                                <td className="py-2.5 px-3.5">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    st.isRepeater
                                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                    {st.repeaterStatus}
                                  </span>
                                </td>

                                {/* EDITABLE COUNSELLING DROPDOWN FOR OFFICIALS (YES / NO) */}
                                <td className="py-2 px-3 bg-rose-50/50 border-l border-r border-rose-200">
                                  <select
                                    value={counsellingVal}
                                    onChange={(e) => handleCounsellingChange(key, e.target.value)}
                                    className={`w-full min-w-[85px] text-sm font-bold py-1.5 px-2.5 rounded-lg border-2 shadow-2xs cursor-pointer ${
                                      counsellingVal === 'Yes'
                                        ? 'border-rose-400 bg-rose-50 text-rose-950 focus:ring-2 focus:ring-rose-500'
                                        : 'border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-slate-400'
                                    }`}
                                    title="Edit Counselling Needed (Yes/No)"
                                  >
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                  </select>
                                </td>

                                {/* EDITABLE DROPOUT REASON FOR OFFICIALS */}
                                <td className="py-2 px-3 bg-sky-50/40 border-l border-r border-sky-200">
                                  <input
                                    type="text"
                                    value={st.dropoutReason || ''}
                                    placeholder="Enter dropout reason..."
                                    onChange={(e) => handleDropoutReasonChange(key, e.target.value)}
                                    className="w-full min-w-[200px] text-sm py-1.5 px-3 rounded-lg border-2 border-sky-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs font-medium placeholder:text-slate-400 placeholder:italic"
                                    title="Edit Dropout Reason"
                                  />
                                </td>

                                {/* EDITABLE PRESENT STATUS DROPDOWN FOR OFFICIALS */}
                                <td className="py-2 px-3 bg-amber-50/50 border-l border-r border-amber-200">
                                  <select
                                    value={st.status}
                                    onChange={(e) => handleStatusChange(key, e.target.value)}
                                    className="w-full text-sm font-bold py-1.5 px-2.5 rounded-lg border-2 border-amber-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
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

                                <td className="py-2.5 px-3.5 text-sm text-slate-800 font-bold">{st.contactNo || '-'}</td>

                                {/* EDITABLE REMARKS FOR OFFICIALS */}
                                <td className="py-2 px-3 bg-indigo-50/40 border-l border-r border-indigo-200">
                                  <input
                                    type="text"
                                    value={st.remarks || ''}
                                    placeholder="Enter remarks..."
                                    onChange={(e) => handleRemarksChange(key, e.target.value)}
                                    className="w-full min-w-[200px] text-sm py-1.5 px-3 rounded-lg border-2 border-indigo-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-medium placeholder:text-slate-400 placeholder:italic"
                                    title="Edit Remarks"
                                  />
                                </td>
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
            )
          )}

          {/* ======================================================== */}
          {/* 5. INDIVIDUAL DEPARTMENT SLICERS (HEALTH, LABOUR, DCPO, etc.) */}
          {/* ======================================================== */}
          {selectedSlicer !== 'Overview' && 
           selectedSlicer !== 'Division' && 
           selectedSlicer !== 'Line Department Overview' && 
           selectedSlicer !== 'Counselling' &&
           selectedSlicer !== 'Revenue Department' && (
            !authenticatedDepts[selectedSlicer] ? (
              <DepartmentLoginForm
                departmentName={selectedSlicer}
                credentials={deptCredentials[selectedSlicer] || DEFAULT_DEPARTMENT_CREDENTIALS[selectedSlicer]}
                departmentMeta={DEPT_META[selectedSlicer]}
                onLoginSuccess={(userId) => handleDepartmentLoginSuccess(selectedSlicer, userId)}
                onCancel={() => setSelectedSlicer('Line Department Overview')}
              />
            ) : (
            <div className="space-y-6">
              
              {/* Authorized Department Session Banner */}
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider block">
                      Authorized Department Session
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-900">
                      Logged in as: <span className="font-mono font-black">{deptCredentials[selectedSlicer]?.userId || 'official'}</span> • {selectedSlicer}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDepartmentLogout(selectedSlicer)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 shadow-2xs transition-colors cursor-pointer"
                  title={`Lock ${selectedSlicer} and logout`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Lock / Logout</span>
                </button>
              </div>

              {/* Header without long description, with quick Export Options */}
              <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {(() => {
                    const meta = DEPT_META[selectedSlicer] || DEPT_META['Overview'];
                    const IconComponent = meta.icon;
                    return (
                      <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-md">
                        <IconComponent className="w-6 h-6" />
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {selectedSlicer} Dashboard
                    </h2>
                    <p className="text-sm sm:text-base text-slate-700 font-bold mt-0.5">
                      Intervention &amp; Tracking for {selectedMonth}
                    </p>
                  </div>
                </div>

                {/* Export Students List in Excel, Word format */}
                {(() => {
                  const currentDept = computedDepartments.find(d => d.name === selectedSlicer);
                  const deptStudents = currentDept?.students || [];

                  return (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => exportStudentsToExcel(deptStudents, `${selectedSlicer}_Students_${selectedMonth}`)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs border border-emerald-800 transition-all active:scale-95 cursor-pointer"
                        title="Download Excel format"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Excel (.xlsx)</span>
                      </button>

                      <button
                        onClick={() => exportStudentsToWord(deptStudents, `${selectedSlicer}_Students_${selectedMonth}`)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs border border-blue-800 transition-all active:scale-95 cursor-pointer"
                        title="Download Word format"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Word (.doc)</span>
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* 4 Summary Boxes: Potential Dropout, Re-Enrolled, Repeaters, Counselling Needed with uniform colorful professional styling */}
              {(() => {
                const currentDept = computedDepartments.find(d => d.name === selectedSlicer);
                const deptStudents = currentDept?.students || [];
                const repCount = deptStudents.filter(s => s.isRepeater).length;
                const reEnrCount = deptStudents.filter(s => s.isReEnrolled).length;
                const counselCount = deptStudents.filter(s => s.isCounsellingNeeded).length;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Box 1: No. of Potential Dropout in this Department */}
                    <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wider block">
                        Potential Dropout
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-blue-950 font-mono mt-2">
                        {deptStudents.length}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-700 mt-1.5 font-bold pt-2 border-t border-blue-100">
                        Assigned to {selectedSlicer}
                      </div>
                    </div>

                    {/* Box 2: Re-Enrolled */}
                    <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wider block">
                        Re-Enrolled
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-blue-950 font-mono mt-2">
                        {reEnrCount}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-700 mt-1.5 font-bold pt-2 border-t border-blue-100">
                        Re-enrolled in School
                      </div>
                    </div>

                    {/* Box 3: Repeaters */}
                    <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wider block">
                        Repeaters
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-blue-950 font-mono mt-2">
                        {repCount}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-700 mt-1.5 font-bold pt-2 border-t border-blue-100">
                        Repeaters Caseload
                      </div>
                    </div>

                    {/* Box 4: Counselling Needed */}
                    <div className="bg-gradient-to-b from-blue-50/70 via-white to-white border-2 border-blue-600 rounded-2xl p-4 sm:p-5 shadow-sm text-center">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wider block">
                        Counselling Needed
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-blue-950 font-mono mt-2">
                        {counselCount}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-700 mt-1.5 font-bold pt-2 border-t border-blue-100">
                        Emotional Support / Guidance
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Student Directory with ALL Columns, Editable Counselling Dropdown (Yes/No), Dropout Reason, Present Status, and Remarks */}
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
                  <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <Users className="w-5 h-5 text-slate-800" />
                          <span>Assigned Student Records ({filteredStudents.length})</span>
                        </h3>
                        <p className="text-sm text-slate-600 font-medium">
                          Department officials can edit Counselling (Yes/No), Dropout Reason, Present Status, and Remarks for each student below. Changes save automatically.
                        </p>
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Search student, block, EMIS..."
                          value={deptSearch}
                          onChange={(e) => setDeptSearch(e.target.value)}
                          className="text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 w-full sm:w-60 font-medium"
                        />
                      </div>
                    </div>

                    {/* Table with ALL Columns and Editable Counselling Dropdown (Yes/No), Dropout Reason, Present Status, and Remarks */}
                    <div className="overflow-x-auto rounded-xl border-2 border-slate-300 max-h-[32rem] overflow-y-auto bg-white">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-300 sticky top-0 z-10">
                          <tr>
                            <th className="py-3 px-3.5">S.No</th>
                            <th className="py-3 px-3.5">Student Name</th>
                            <th className="py-3 px-3.5">EMIS ID</th>
                            <th className="py-3 px-3.5">Division</th>
                            <th className="py-3 px-3.5">Taluk</th>
                            <th className="py-3 px-3.5">Block</th>
                            <th className="py-3 px-3.5">School</th>
                            <th className="py-3 px-3.5">Category</th>
                            <th className="py-3 px-3.5">Gender</th>
                            <th className="py-3 px-3.5">Class</th>
                            <th className="py-3 px-3.5">Address</th>
                            <th className="py-3 px-3.5">Contact No</th>
                            <th className="py-3 px-3.5">Repeater</th>
                            <th className="py-3 px-3.5 min-w-32 bg-rose-100/70 text-rose-950 font-black border-l border-r border-rose-300">
                              Counselling (Dropdown)
                            </th>
                            <th className="py-3 px-3.5 min-w-56 bg-sky-100/70 text-sky-950 font-black border-l border-r border-sky-300">
                              Dropout Reason (Editable)
                            </th>
                            <th className="py-3 px-3.5 min-w-48 bg-amber-100/70 text-amber-950 font-black border-l border-r border-amber-300">
                              Present Status (Editable Dropdown)
                            </th>
                            <th className="py-3 px-3.5 min-w-56 bg-indigo-100/70 text-indigo-950 font-black border-l border-r border-indigo-300">
                              Remarks (Editable)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                          {filteredStudents.map((st, idx) => {
                            const key = st.emisId || String(st.sNo);
                            const counsellingVal = (st.counsellingRequired === 'Yes' || st.isCounsellingNeeded) ? 'Yes' : 'No';
                            return (
                              <tr key={`st-${key}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3.5 font-bold text-slate-600">{st.sNo}</td>
                                <td className="py-2.5 px-3.5 font-black text-slate-900">{st.studentName}</td>
                                <td className="py-2.5 px-3.5 text-slate-700 font-bold">{st.emisId || '-'}</td>
                                <td className="py-2.5 px-3.5 text-slate-700">{st.division}</td>
                                <td className="py-2.5 px-3.5 font-bold text-slate-800">{st.taluk}</td>
                                <td className="py-2.5 px-3.5 font-bold text-slate-800">{st.block}</td>
                                <td className="py-2.5 px-3.5 text-slate-700 max-w-xs truncate">{st.school}</td>
                                <td className="py-2.5 px-3.5 text-slate-600">{st.category}</td>
                                <td className="py-2.5 px-3.5 text-slate-700">{st.gender}</td>
                                <td className="py-2.5 px-3.5 text-slate-800 font-bold">
                                  Std {st.std} {st.sec ? `(${st.sec})` : ''}
                                </td>
                                <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate">{st.address || '-'}</td>
                                <td className="py-2.5 px-3.5 text-slate-800 font-bold">{st.contactNo || '-'}</td>
                                <td className="py-2.5 px-3.5">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    st.isRepeater
                                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                    {st.repeaterStatus}
                                  </span>
                                </td>

                                {/* EDITABLE COUNSELLING DROPDOWN FOR OFFICIALS (YES / NO) */}
                                <td className="py-2 px-3 bg-rose-50/50 border-l border-r border-rose-200">
                                  <select
                                    value={counsellingVal}
                                    onChange={(e) => handleCounsellingChange(key, e.target.value)}
                                    className={`w-full min-w-[85px] text-sm font-bold py-1.5 px-2.5 rounded-lg border-2 shadow-2xs cursor-pointer ${
                                      counsellingVal === 'Yes'
                                        ? 'border-rose-400 bg-rose-50 text-rose-950 focus:ring-2 focus:ring-rose-500'
                                        : 'border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-slate-400'
                                    }`}
                                    title="Edit Counselling Needed (Yes/No)"
                                  >
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                  </select>
                                </td>

                                {/* EDITABLE DROPOUT REASON FOR OFFICIALS */}
                                <td className="py-2 px-3 bg-sky-50/40 border-l border-r border-sky-200">
                                  <input
                                    type="text"
                                    value={st.dropoutReason || ''}
                                    placeholder="Enter dropout reason..."
                                    onChange={(e) => handleDropoutReasonChange(key, e.target.value)}
                                    className="w-full min-w-[200px] text-sm py-1.5 px-3 rounded-lg border-2 border-sky-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs font-medium placeholder:text-slate-400 placeholder:italic"
                                    title="Edit Dropout Reason"
                                  />
                                </td>

                                {/* EDITABLE PRESENT STATUS DROPDOWN FOR OFFICIALS */}
                                <td className="py-2 px-3 bg-amber-50/50 border-l border-r border-amber-200">
                                  <select
                                    value={st.status}
                                    onChange={(e) => handleStatusChange(key, e.target.value)}
                                    className="w-full text-sm font-bold py-1.5 px-2.5 rounded-lg border-2 border-amber-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
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

                                {/* EDITABLE REMARKS FOR OFFICIALS */}
                                <td className="py-2 px-3 bg-indigo-50/40 border-l border-r border-indigo-200">
                                  <input
                                    type="text"
                                    value={st.remarks || ''}
                                    placeholder="Enter department remarks..."
                                    onChange={(e) => handleRemarksChange(key, e.target.value)}
                                    className="w-full min-w-[200px] text-sm py-1.5 px-3 rounded-lg border-2 border-indigo-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-medium placeholder:text-slate-400 placeholder:italic"
                                    title="Edit Remarks"
                                  />
                                </td>
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
            )
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-slate-300 bg-white/95 py-4 px-4 text-center text-sm text-slate-700 font-bold mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TamilNaduLogo className="w-6 h-6" size={24} />
            <span>Thoothukudi District - Potential Dropout Dashboard</span>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 font-medium">
            Sourced directly from Google Sheets • Last synchronized: {data?.lastFetched ? new Date(data.lastFetched).toLocaleTimeString() : 'Just now'}
          </div>
        </div>
      </footer>
    </div>
  );
}
