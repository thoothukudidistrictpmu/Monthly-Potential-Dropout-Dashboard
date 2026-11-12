import React, { useState } from 'react';
import { 
  Users, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  Filter, 
  RotateCcw, 
  GraduationCap, 
  Clock, 
  HelpCircle,
  ShieldAlert,
  HeartPulse,
  UserCheck
} from 'lucide-react';
import { StudentRecord } from '../sheetData';

interface CounsellorSlicerViewProps {
  agencyName: 'DCPO Counsellors' | 'ICTC Counsellors' | 'PAD Counsellors';
  allStudents: StudentRecord[];
  selectedMonth: string;
  dynamicCounsellingByOptions: string[];
  deptList: string[];
  presentStatusOptions: string[];
  handleStatusChange: (studentKey: string, newStatus: string) => void;
  handleDropoutReasonChange: (studentKey: string, newReason: string) => void;
  handleCounsellingChange: (studentKey: string, newVal: string) => void;
  handleCounsellingByChange: (studentKey: string, newCounsellor: string) => void;
  handleCounsellorNameChange: (studentKey: string, newName: string) => void;
  handleCounsellingDateChange: (studentKey: string, newDate: string) => void;
  handleTransferDeptChange: (studentKey: string, newDept: string) => void;
  handleBrteRemarksChange: (studentKey: string, newRemarks: string) => void;
  handleDeptRemarksChange: (studentKey: string, newRemarks: string) => void;
  exportStudentsToExcel: (students: StudentRecord[], filename: string) => void;
  exportStudentsToWord: (students: StudentRecord[], title: string) => void;
}

export function CounsellorSlicerView({
  agencyName,
  allStudents,
  selectedMonth,
  dynamicCounsellingByOptions,
  deptList,
  presentStatusOptions,
  handleStatusChange,
  handleDropoutReasonChange,
  handleCounsellingChange,
  handleCounsellingByChange,
  handleCounsellorNameChange,
  handleCounsellingDateChange,
  handleTransferDeptChange,
  handleBrteRemarksChange,
  handleDeptRemarksChange,
  exportStudentsToExcel,
  exportStudentsToWord,
}: CounsellorSlicerViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Agency styling config
  const agencyMeta = {
    'DCPO Counsellors': {
      icon: ShieldAlert,
      badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      headerBg: 'bg-indigo-900',
      headerGradient: 'from-indigo-900 to-slate-900',
      keyword: 'dcpo',
      description: 'District Child Protection Unit Counsellors Intervention Directory',
    },
    'ICTC Counsellors': {
      icon: HeartPulse,
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      headerBg: 'bg-emerald-900',
      headerGradient: 'from-emerald-900 to-teal-950',
      keyword: 'ictc',
      description: 'Integrated Counselling & Health Intervention Directory',
    },
    'PAD Counsellors': {
      icon: UserCheck,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      headerBg: 'bg-amber-900',
      headerGradient: 'from-amber-900 to-yellow-950',
      keyword: 'pad',
      description: 'Public Health & Adolescent Counselling Directory',
    },
  }[agencyName];

  const IconComponent = agencyMeta.icon;
  const keyword = agencyMeta.keyword;

  // Filter students assigned to this counsellor agency
  const agencyStudents = allStudents.filter(s => {
    const by = (s.counsellingBy || '').toLowerCase().trim();
    return by.includes(keyword);
  });

  // Filtered dataset based on user controls
  const filteredStudents = agencyStudents.filter(st => {
    const matchDiv = selectedDivision === 'All' || st.division.toLowerCase() === selectedDivision.toLowerCase();
    const matchDept = selectedDept === 'All' || st.lineDept === selectedDept;
    const matchStatus = selectedStatus === 'All' || st.status === selectedStatus;
    const matchSearch = !searchQuery ||
      st.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.block.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.lineDept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.counsellorName && st.counsellorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (st.brteRemarks && st.brteRemarks.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (st.deptRemarks && st.deptRemarks.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (st.remarks && st.remarks.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (st.emisId && st.emisId.includes(searchQuery));
    return matchDiv && matchDept && matchStatus && matchSearch;
  });

  // KPI counts
  const totalCaseload = agencyStudents.length;
  const reEnrolledCount = agencyStudents.filter(s => s.isReEnrolled).length;
  const repeatersCount = agencyStudents.filter(s => s.isRepeater).length;
  const highAbsenteeCount = agencyStudents.filter(s => {
    const days = parseInt(s.absentDays, 10);
    return !isNaN(days) && days >= 30;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header and Download Controls */}
      <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={`p-5 sm:p-6 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r ${agencyMeta.headerGradient} text-white`}>
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${agencyMeta.badgeColor}`}>
                {agencyName}
              </span>
              <span className="text-xs text-slate-200 font-bold">
                {selectedMonth} Directory
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 mt-1.5">
              <IconComponent className="w-6 h-6 text-slate-200" />
              <span>{agencyName} — Student Caseload & Interventions</span>
            </h2>
          </div>

          {/* Export Options */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => exportStudentsToExcel(filteredStudents, `${agencyName.replace(/\s+/g, '_')}_Students_${selectedMonth}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/20 hover:bg-white/30 text-white shadow-xs border border-white/30 transition-all active:scale-95 cursor-pointer"
              title="Download Excel format with all columns including Col X & Col Y remarks"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => exportStudentsToWord(filteredStudents, `${agencyName} Caseload Students — ${selectedMonth}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/20 hover:bg-white/30 text-white shadow-xs border border-white/30 transition-all active:scale-95 cursor-pointer"
              title="Download Word format"
            >
              <FileText className="w-4 h-4" />
              <span>Word (.doc)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Caseload */}
        <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl overflow-hidden shadow-2xs text-center flex flex-col justify-between">
          <div className="bg-[#1e3a5f] text-white px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Assigned Caseload</span>
          </div>
          <div className="p-4">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 font-mono tracking-tight">
              {totalCaseload}
            </div>
            <div className="text-xs sm:text-sm text-slate-700 mt-1 font-bold">
              Total Students
            </div>
          </div>
        </div>

        {/* Re-Enrolled */}
        <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl overflow-hidden shadow-2xs text-center flex flex-col justify-between">
          <div className="bg-emerald-800 text-white px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Re-Enrolled</span>
          </div>
          <div className="p-4">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-950 font-mono tracking-tight">
              {reEnrolledCount}
            </div>
            <div className="text-xs sm:text-sm text-emerald-800 mt-1 font-bold">
              {totalCaseload > 0 ? ((reEnrolledCount / totalCaseload) * 100).toFixed(0) : 0}% Success Rate
            </div>
          </div>
        </div>

        {/* Repeaters */}
        <div className="bg-purple-50/70 border-2 border-purple-300 rounded-2xl overflow-hidden shadow-2xs text-center flex flex-col justify-between">
          <div className="bg-purple-900 text-white px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repeaters</span>
          </div>
          <div className="p-4">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-purple-950 font-mono tracking-tight">
              {repeatersCount}
            </div>
            <div className="text-xs sm:text-sm text-purple-900 mt-1 font-bold">
              Repeater Caseload
            </div>
          </div>
        </div>

        {/* Absent > 30 Days */}
        <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl overflow-hidden shadow-2xs text-center flex flex-col justify-between">
          <div className="bg-rose-900 text-white px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Absent &gt; 30 Days</span>
          </div>
          <div className="p-4">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-rose-950 font-mono tracking-tight">
              {highAbsenteeCount}
            </div>
            <div className="text-xs sm:text-sm text-rose-800 mt-1 font-bold">
              Priority Focus
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl shadow-sm overflow-hidden space-y-4">
        <div className="bg-[#1e3a5f] text-white px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-200" />
              <span>
                {agencyName} Verified Students ({filteredStudents.length})
              </span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Division Filter */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
              <Filter className="w-4 h-4 text-slate-700 shrink-0" />
              <label htmlFor={`${agencyName}-div-filter`} className="text-xs font-bold text-slate-700 uppercase">
                Division:
              </label>
              <select
                id={`${agencyName}-div-filter`}
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="text-xs sm:text-sm font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="All">All Divisions</option>
                <option value="Kovilpatti">Kovilpatti</option>
                <option value="Thoothukudi">Thoothukudi</option>
                <option value="Tiruchendur">Tiruchendur</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
              <Filter className="w-4 h-4 text-slate-700 shrink-0" />
              <label htmlFor={`${agencyName}-dept-filter`} className="text-xs font-bold text-slate-700 uppercase">
                Dept:
              </label>
              <select
                id={`${agencyName}-dept-filter`}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs sm:text-sm font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="All">All Depts</option>
                {deptList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
              <label htmlFor={`${agencyName}-status-filter`} className="text-xs font-bold text-slate-700 uppercase">
                Status:
              </label>
              <select
                id={`${agencyName}-status-filter`}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs sm:text-sm font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="All">All Statuses</option>
                {presentStatusOptions.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student, EMIS, remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs sm:text-sm pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 w-full sm:w-56 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Full Students Data Table with FREEZED Student Name on Laptop */}
        <div className="p-5 sm:p-6 pt-0">
          <div className="overflow-x-auto rounded-xl border-2 border-slate-300 max-h-[34rem] overflow-y-auto bg-white">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#1e3a5f] text-white font-bold sticky top-0 z-30 shadow-xs">
                <tr>
                  <th className="py-3 px-3 text-center md:sticky md:left-0 md:z-30 bg-[#1e3a5f] w-12">
                    S.No
                  </th>
                  <th className="py-3 px-3.5 md:sticky md:left-12 md:z-30 bg-[#1e3a5f] md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.18)] min-w-44">
                    Student Name
                  </th>
                  <th className="py-3 px-3">EMIS ID</th>
                  <th className="py-3 px-3">Line Dept</th>
                  <th className="py-3 px-3">Division</th>
                  <th className="py-3 px-3">Taluk</th>
                  <th className="py-3 px-3">Block</th>
                  <th className="py-3 px-3.5">School</th>
                  <th className="py-3 px-3 text-center">Class</th>
                  <th className="py-3 px-3 text-center">Absent</th>
                  <th className="py-3 px-3 text-center">Gender</th>
                  <th className="py-3 px-3">Contact No</th>
                  <th className="py-3 px-3">Repeater</th>
                  <th className="py-3 px-3.5 min-w-32 bg-rose-900 text-white font-black border-l border-r border-rose-800">
                    Counselling
                  </th>
                  <th className="py-3 px-3.5 min-w-44 bg-blue-900 text-white font-black border-l border-r border-blue-800">
                    Counselling By
                  </th>
                  <th className="py-3 px-3.5 min-w-44 bg-indigo-900 text-white font-black border-l border-r border-indigo-800">
                    Counsellor Name
                  </th>
                  <th className="py-3 px-3.5 min-w-36 bg-violet-900 text-white font-black border-l border-r border-violet-800">
                    Counselling Date
                  </th>
                  <th className="py-3 px-3.5 min-w-44 bg-teal-900 text-white font-black border-l border-r border-teal-800">
                    Transfer Request
                  </th>
                  <th className="py-3 px-3.5 min-w-52 bg-sky-900 text-white font-black border-l border-r border-sky-800">
                    Dropout Reason
                  </th>
                  <th className="py-3 px-3.5 min-w-48 bg-amber-900 text-white font-black border-l border-r border-amber-800">
                    Present Status
                  </th>
                  <th className="py-3 px-3.5 min-w-64 bg-cyan-900 text-white font-black border-l border-r border-cyan-800">
                    BRTE / HM Remarks (Case Study) [Col X]
                  </th>
                  <th className="py-3 px-3.5 min-w-64 bg-indigo-900 text-white font-black border-l border-r border-indigo-800">
                    Department / Counsellors Remarks [Col Y]
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {filteredStudents.map((st, idx) => {
                  const key = st.emisId || String(st.sNo);
                  const counsellingVal = (st.counsellingRequired === 'Yes' || st.isCounsellingNeeded) ? 'Yes' : 'No';

                  return (
                    <tr key={`agency-${st.emisId || st.sNo}-${idx}`} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-2.5 px-3 text-slate-600 font-bold md:sticky md:left-0 md:z-20 bg-white group-hover:bg-slate-50 text-center">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3.5 font-black text-slate-900 md:sticky md:left-12 md:z-20 bg-white group-hover:bg-slate-50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                        {st.studentName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 font-bold">{st.emisId || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-300">
                          {st.lineDept}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-bold">{st.division}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{st.taluk}</td>
                      <td className="py-2.5 px-3">{st.block}</td>
                      <td className="py-2.5 px-3.5 max-w-xs truncate" title={st.school}>{st.school}</td>
                      <td className="py-2.5 px-3 text-center font-bold">Std {st.std} {st.sec ? `(${st.sec})` : ''}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{st.absentDays || '-'}</td>
                      <td className="py-2.5 px-3 text-center">{st.gender}</td>
                      <td className="py-2.5 px-3 font-bold">{st.contactNo || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          st.isRepeater
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {st.repeaterStatus}
                        </span>
                      </td>

                      {/* EDITABLE COUNSELLING (YES/NO) */}
                      <td className="py-2 px-3 bg-rose-50/50 border-l border-r border-rose-200">
                        <select
                          value={counsellingVal}
                          onChange={(e) => handleCounsellingChange(key, e.target.value)}
                          className={`w-full min-w-[85px] text-xs font-bold py-1.5 px-2.5 rounded-lg border-2 shadow-2xs cursor-pointer ${
                            counsellingVal === 'Yes'
                              ? 'border-rose-400 bg-rose-50 text-rose-950 focus:ring-2 focus:ring-rose-500'
                              : 'border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-slate-400'
                          }`}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>

                      {/* EDITABLE COUNSELLING BY DROPDOWN */}
                      <td className="py-2 px-3 bg-blue-50/50 border-l border-r border-blue-200">
                        <select
                          value={st.counsellingBy || ''}
                          onChange={(e) => handleCounsellingByChange(key, e.target.value)}
                          className="w-full min-w-[170px] text-xs font-bold py-1.5 px-2.5 rounded-lg border-2 border-blue-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                          title="Counselling By (From Tracker Sheet Column T)"
                        >
                          <option value="">Not Assigned</option>
                          {dynamicCounsellingByOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          {st.counsellingBy && !dynamicCounsellingByOptions.includes(st.counsellingBy) && (
                            <option value={st.counsellingBy}>{st.counsellingBy}</option>
                          )}
                        </select>
                      </td>

                      {/* EDITABLE COUNSELLOR NAME */}
                      <td className="py-2 px-3 bg-indigo-50/50 border-l border-r border-indigo-200">
                        <input
                          type="text"
                          value={st.counsellorName || ''}
                          placeholder="Counsellor name..."
                          onChange={(e) => handleCounsellorNameChange(key, e.target.value)}
                          className="w-full min-w-[150px] text-xs font-bold py-1 px-2 rounded-lg border-2 border-indigo-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs placeholder:text-slate-400 placeholder:italic"
                          title="Counsellor Name (Column U in Google Sheet)"
                        />
                      </td>

                      {/* EDITABLE COUNSELLING DATE */}
                      <td className="py-2 px-3 bg-violet-50/50 border-l border-r border-violet-200">
                        <input
                          type="text"
                          value={st.counsellingDate || ''}
                          placeholder="Date..."
                          onChange={(e) => handleCounsellingDateChange(key, e.target.value)}
                          className="w-full min-w-[120px] text-xs font-bold py-1 px-2 rounded-lg border-2 border-violet-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-2xs placeholder:text-slate-400 placeholder:italic"
                          title="Counselling Given Date (Column V in Google Sheet)"
                        />
                      </td>

                      {/* EDITABLE TRANSFER REQUEST */}
                      <td className="py-2 px-3 bg-teal-50/50 border-l border-r border-teal-200">
                        <select
                          value={st.transferRequestDept || ''}
                          onChange={(e) => handleTransferDeptChange(key, e.target.value)}
                          className="w-full min-w-[150px] text-xs font-bold py-1 px-2 rounded-lg border-2 border-teal-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs cursor-pointer"
                          title="Request to Transfer Case to another Department"
                        >
                          <option value="">No Transfer</option>
                          {deptList.map(d => (
                            <option key={d} value={d}>Transfer to {d}</option>
                          ))}
                        </select>
                      </td>

                      {/* EDITABLE DROPOUT REASON */}
                      <td className="py-2 px-3 bg-sky-50/40 border-l border-r border-sky-200">
                        <input
                          type="text"
                          value={st.dropoutReason || ''}
                          placeholder="Dropout reason..."
                          onChange={(e) => handleDropoutReasonChange(key, e.target.value)}
                          className="w-full min-w-[180px] text-xs py-1.5 px-2.5 rounded-lg border-2 border-sky-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs font-medium placeholder:text-slate-400 placeholder:italic"
                          title="Edit Dropout Reason"
                        />
                      </td>

                      {/* EDITABLE PRESENT STATUS DROPDOWN */}
                      <td className="py-2 px-3 bg-amber-50/50 border-l border-r border-amber-200">
                        <select
                          value={st.status}
                          onChange={(e) => handleStatusChange(key, e.target.value)}
                          className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border-2 border-amber-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                        >
                          {presentStatusOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          {!presentStatusOptions.includes(st.status) && (
                            <option value={st.status}>{st.status}</option>
                          )}
                        </select>
                      </td>

                      {/* EDITABLE BRTE / HM REMARKS (CASE STUDY) [COLUMN X] */}
                      <td className="py-2 px-3 bg-cyan-50/50 border-l border-r border-cyan-200">
                        <input
                          type="text"
                          value={st.brteRemarks || ''}
                          placeholder="BRTE / HM case study remarks..."
                          onChange={(e) => handleBrteRemarksChange(key, e.target.value)}
                          className="w-full min-w-[220px] text-xs py-1.5 px-2.5 rounded-lg border-2 border-cyan-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs font-medium placeholder:text-slate-400 placeholder:italic"
                          title="BRTE / HM Remarks (Case Study) [Column X in Google Sheet]"
                        />
                      </td>

                      {/* EDITABLE DEPARTMENT / COUNSELLORS REMARKS [COLUMN Y] */}
                      <td className="py-2 px-3 bg-indigo-50/50 border-l border-r border-indigo-200">
                        <input
                          type="text"
                          value={st.deptRemarks || st.remarks || ''}
                          placeholder="Department / counsellor remarks..."
                          onChange={(e) => handleDeptRemarksChange(key, e.target.value)}
                          className="w-full min-w-[220px] text-xs py-1.5 px-2.5 rounded-lg border-2 border-indigo-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-medium placeholder:text-slate-400 placeholder:italic"
                          title="Department / Counsellors Remarks [Column Y in Google Sheet]"
                        />
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={22} className="py-12 text-center text-slate-500 font-bold">
                      No student records match the selected filters for {agencyName}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
