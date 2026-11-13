import * as XLSX from 'xlsx';
import { StudentRecord, DepartmentAbstract } from './sheetData';

export interface DivisionBlockSummary {
  name: string;
  count: number;
  repeaters: number;
  reEnrolled: number;
  counsellingNeeded: number;
}

export interface DivisionExportData {
  name: string;
  totalStudents: number;
  repeaters: number;
  reEnrolled: number;
  counsellingNeeded: number;
  blocks: DivisionBlockSummary[];
}

export function exportStudentsToExcel(students: StudentRecord[], filename: string) {
  const exportData = students.map((s, index) => ({
    'S.No': s.sNo || index + 1,
    'Student Name': s.studentName,
    'EMIS ID': s.emisId || '-',
    'Division Name': s.division,
    'Taluk Name': s.taluk,
    'Block Name': s.block,
    'School Name': s.school,
    'Category': s.category,
    'Gender': s.gender,
    'Standard': s.std,
    'Section': s.sec,
    'Absent Days': s.absentDays || '-',
    'Address': s.address,
    'Contact No': s.contactNo,
    'Repeater or Not': s.repeaterStatus,
    'Line Department': s.lineDept,
    'Dropout Reason': s.dropoutReason,
    'Request to Transfer Department': s.transferRequestDept || '-',
    'Counselling Required': s.counsellingRequired || (s.isCounsellingNeeded ? 'Yes' : 'No'),
    'Counselling By': s.counsellingBy || 'Not assigned',
    'Counsellor Name': s.counsellorName || '-',
    'Counselling Given Date': s.counsellingDate || '-',
    'Present Status': s.status,
    'BRTE / HM Remarks (Case Study)': s.brteRemarks || '-',
    'Department / Counsellors Remarks': s.deptRemarks || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  
  // Auto-fit column widths
  const maxProps = Object.keys(exportData[0] || {}).map(key => ({
    wch: Math.max(key.length, 14)
  }));
  worksheet['!cols'] = maxProps;

  XLSX.writeFile(workbook, `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`);
}

export function exportDivisionToExcel(division: DivisionExportData, students: StudentRecord[], filename: string) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Division Summary & Block Breakdown
  const summaryRows = [
    { 'Metric': 'Division Name', 'Value': `${division.name} Division` },
    { 'Metric': 'Total Potential Dropouts', 'Value': division.totalStudents },
    { 'Metric': 'Repeaters', 'Value': division.repeaters },
    { 'Metric': 'Re-Enrolled', 'Value': division.reEnrolled },
    { 'Metric': 'Counselling Needed', 'Value': division.counsellingNeeded },
    { 'Metric': 'Total Blocks', 'Value': division.blocks.length },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Division Overview');

  // Sheet 2: Block-Wise Breakdown
  const blockRows = division.blocks.map(b => {
    const pct = division.totalStudents > 0 ? ((b.count / division.totalStudents) * 100).toFixed(1) + '%' : '0%';
    return {
      'Educational Block': b.name,
      'Potential Dropouts': b.count,
      'Repeaters': b.repeaters,
      'Re-Enrolled': b.reEnrolled,
      'Counselling Needed': b.counsellingNeeded,
      'Division Share': pct,
    };
  });
  // Add total row
  blockRows.push({
    'Educational Block': `Total (${division.name} Division)`,
    'Potential Dropouts': division.totalStudents,
    'Repeaters': division.repeaters,
    'Re-Enrolled': division.reEnrolled,
    'Counselling Needed': division.counsellingNeeded,
    'Division Share': '100%',
  });
  const blockSheet = XLSX.utils.json_to_sheet(blockRows);
  XLSX.utils.book_append_sheet(workbook, blockSheet, 'Block Breakdown');

  // Sheet 3: Full Student Records in this Division
  const studentRows = students.map((s, index) => ({
    'S.No': s.sNo || index + 1,
    'Student Name': s.studentName,
    'EMIS ID': s.emisId || '-',
    'Block Name': s.block,
    'Taluk Name': s.taluk,
    'School Name': s.school,
    'Category': s.category,
    'Class': s.std,
    'Section': s.sec,
    'Absent Days': s.absentDays || '-',
    'Gender': s.gender,
    'Contact No': s.contactNo,
    'Repeater': s.repeaterStatus,
    'Line Department': s.lineDept,
    'Dropout Reason': s.dropoutReason,
    'Request to Transfer Department': s.transferRequestDept || '-',
    'Counselling Required': s.counsellingRequired || (s.isCounsellingNeeded ? 'Yes' : 'No'),
    'Counselling By': s.counsellingBy || 'Not assigned',
    'Counsellor Name': s.counsellorName || '-',
    'Counselling Given Date': s.counsellingDate || '-',
    'Present Status': s.status,
    'BRTE / HM Remarks (Case Study)': s.brteRemarks || '-',
    'Department / Counsellors Remarks': s.deptRemarks || '-',
  }));
  const studentsSheet = XLSX.utils.json_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(workbook, studentsSheet, `${division.name} Students`);

  XLSX.writeFile(workbook, `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`);
}

export function exportDivisionToWord(division: DivisionExportData, students: StudentRecord[], title: string) {
  const blockRowsHtml = division.blocks.map(b => {
    const pct = division.totalStudents > 0 ? ((b.count / division.totalStudents) * 100).toFixed(1) + '%' : '0%';
    return `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:8px;font-weight:bold;">${b.name}</td>
        <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:bold;">${b.count}</td>
        <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;">${b.repeaters}</td>
        <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;">${b.reEnrolled}</td>
        <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;">${b.counsellingNeeded}</td>
        <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;">${pct}</td>
      </tr>
    `;
  }).join('');

  const studentRowsHtml = students.map((s, index) => `
    <tr>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.sNo || index + 1}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;font-weight:bold;">${s.studentName}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.emisId || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.block}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.taluk}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.school}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">Std ${s.std} ${s.sec ? `(${s.sec})` : ''}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.absentDays || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.gender}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.lineDept}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.dropoutReason || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;font-weight:bold;color:${s.transferRequestDept ? '#0369a1' : '#64748b'};">${s.transferRequestDept || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.counsellingRequired || (s.isCounsellingNeeded ? 'Yes' : 'No')}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;font-weight:bold;">${s.counsellingBy || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.counsellorName || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.counsellingDate || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;font-weight:bold;color:#047857;">${s.status}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.remarks || '-'}</td>
    </tr>
  `).join('');

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'>
    <title>${title}</title>
    <style>
      body { font-family: 'Times New Roman', Times, serif; margin: 24px; color: #1e293b; font-size: 13px; }
      h2 { color: #1e3a5f; margin-bottom: 4px; font-size: 20px; }
      h3 { color: #0f766e; margin-top: 16px; margin-bottom: 8px; font-size: 16px; }
      .meta { color: #475569; margin-bottom: 16px; font-size: 12px; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 20px; }
      th { background-color: #1e3a5f; color: #ffffff; padding: 7px; text-align: left; font-size: 11px; font-weight: bold; border: 1px solid #1e3a5f; }
      .summary-box { display: inline-block; padding: 10px 16px; margin-right: 12px; margin-bottom: 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; }
      .summary-val { font-size: 18px; font-weight: bold; color: #1e3a5f; }
    </style>
    </head>
    <body>
      <h2>Thoothukudi District - Potential Dropout Monitoring Dashboard</h2>
      <div class="meta">${title} | Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>

      <div style="margin-bottom: 16px;">
        <div class="summary-box"><div>Potential Dropouts</div><div class="summary-val">${division.totalStudents}</div></div>
        <div class="summary-box"><div>Repeaters</div><div class="summary-val">${division.repeaters}</div></div>
        <div class="summary-box"><div>Re-Enrolled</div><div class="summary-val">${division.reEnrolled}</div></div>
        <div class="summary-box"><div>Counselling Needed</div><div class="summary-val">${division.counsellingNeeded}</div></div>
      </div>

      <h3>1. Educational Block-Wise Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Educational Block</th>
            <th style="text-align:center;">Potential Dropouts</th>
            <th style="text-align:center;">Repeaters</th>
            <th style="text-align:center;">Re-Enrolled</th>
            <th style="text-align:center;">Counselling Needed</th>
            <th style="text-align:center;">Division Share</th>
          </tr>
        </thead>
        <tbody>
          ${blockRowsHtml}
          <tr style="background:#e2e8f0;font-weight:bold;">
            <td style="border:1px solid #94a3b8;padding:8px;">Total (${division.name} Division)</td>
            <td style="border:1px solid #94a3b8;padding:8px;text-align:center;">${division.totalStudents}</td>
            <td style="border:1px solid #94a3b8;padding:8px;text-align:center;">${division.repeaters}</td>
            <td style="border:1px solid #94a3b8;padding:8px;text-align:center;">${division.reEnrolled}</td>
            <td style="border:1px solid #94a3b8;padding:8px;text-align:center;">${division.counsellingNeeded}</td>
            <td style="border:1px solid #94a3b8;padding:8px;text-align:center;">100%</td>
          </tr>
        </tbody>
      </table>

      <h3>2. Student Records (${students.length} Students)</h3>
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Student Name</th>
            <th>EMIS ID</th>
            <th>Block</th>
            <th>Taluk</th>
            <th>School</th>
            <th>Class</th>
            <th>Absent Days</th>
            <th>Gender</th>
            <th>Line Dept</th>
            <th>Dropout Reason</th>
            <th>Transfer Req</th>
            <th>Counselling</th>
            <th>Counselling By</th>
            <th>Counsellor Name</th>
            <th>Counselling Date</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${studentRowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAbstractToExcel(abstracts: DepartmentAbstract[], filename: string) {
  const exportData = abstracts.map(d => ({
    'Line Department': d.name,
    'Total Potential Dropout': d.potentialDropout,
    'Repeaters': d.repeaters,
    'Re-Enrolled': d.reEnrolled,
    'Counselling Needed': d.counsellingNeeded,
    'Status Not Updated': d.statusNotUpdated,
    'Migrated': d.migrated,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'All Line Dept Abstract');
  XLSX.writeFile(workbook, `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`);
}

export function exportStudentsToWord(students: StudentRecord[], title: string) {
  const tableRows = students.map((s, index) => `
    <tr>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.sNo || index + 1}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;font-weight:bold;">${s.studentName}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.emisId || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.division}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.taluk}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.block}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.school}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">Std ${s.std} ${s.sec ? `(${s.sec})` : ''}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.absentDays || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.gender}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.lineDept}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.dropoutReason || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;font-weight:bold;color:${s.transferRequestDept ? '#0369a1' : '#64748b'};">${s.transferRequestDept || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;font-weight:bold;color:${(s.counsellingRequired === 'Yes' || s.isCounsellingNeeded) ? '#be123c' : '#334155'};">${s.counsellingRequired || (s.isCounsellingNeeded ? 'Yes' : 'No')}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;font-weight:bold;">${s.counsellingBy || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.counsellorName || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.counsellingDate || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;font-weight:bold;color:#047857;">${s.status}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.brteRemarks || '-'}</td>
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.deptRemarks || '-'}</td>
    </tr>
  `).join('');

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'>
    <title>${title}</title>
    <style>
      body { font-family: 'Times New Roman', Times, serif; margin: 24px; color: #1e293b; font-size: 13px; }
      h2 { color: #1e3a5f; margin-bottom: 4px; font-size: 20px; font-family: 'Times New Roman', Times, serif; }
      h3 { color: #334155; margin-top: 2px; margin-bottom: 12px; font-size: 13px; font-weight: normal; font-family: 'Times New Roman', Times, serif; }
      table { border-collapse: collapse; width: 100%; margin-top: 12px; }
      th { background-color: #1e3a5f; color: #ffffff; padding: 7px 5px; text-align: left; font-size: 11px; font-weight: bold; border: 1px solid #1e3a5f; font-family: 'Times New Roman', Times, serif; }
    </style>
    </head>
    <body>
      <h2>Thoothukudi District - Potential Dropout Dashboard</h2>
      <h3>${title} | Total Records: ${students.length} | Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</h3>
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Student Name</th>
            <th>EMIS ID</th>
            <th>Division</th>
            <th>Taluk</th>
            <th>Block</th>
            <th>School</th>
            <th>Class</th>
            <th>Absent Days</th>
            <th>Gender</th>
            <th>Line Dept</th>
            <th>Dropout Reason</th>
            <th>Transfer Req</th>
            <th>Counselling</th>
            <th>Counselling By</th>
            <th>Counsellor Name</th>
            <th>Counselling Date</th>
            <th>Present Status</th>
            <th>BRTE / HM Remarks (Case Study)</th>
            <th>Department Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportStudentsToDocs(students: StudentRecord[], title: string) {
  exportStudentsToWord(students, title);
}

// Format a student record into standardized Excel row object
export function formatStudentRecordForExcel(s: StudentRecord, index: number) {
  return {
    'S.No': s.sNo || index + 1,
    'Student Name': s.studentName,
    'EMIS ID': s.emisId || '-',
    'Division Name': s.division,
    'Taluk Name': s.taluk,
    'Block Name': s.block,
    'School Name': s.school,
    'Category': s.category,
    'Gender': s.gender,
    'Standard': s.std,
    'Section': s.sec,
    'Absent Days': s.absentDays || '-',
    'Address': s.address,
    'Contact No': s.contactNo,
    'Repeater or Not': s.repeaterStatus,
    'Line Department': s.lineDept,
    'Dropout Reason': s.dropoutReason,
    'Request to Transfer Department': s.transferRequestDept || '-',
    'Counselling Required': s.counsellingRequired || (s.isCounsellingNeeded ? 'Yes' : 'No'),
    'Counselling By': s.counsellingBy || 'Not assigned',
    'Counsellor Name': s.counsellorName || '-',
    'Counselling Given Date': s.counsellingDate || '-',
    'Present Status': s.status,
    'BRTE / HM Remarks (Case Study)': s.brteRemarks || '-',
    'Department / Counsellors Remarks': s.deptRemarks || '-',
  };
}

/**
 * Overview Excel Export:
 * Contains 8 distinct sheets:
 * 1. Total Dropouts
 * 2. Re-Enrolled List
 * 3. Migrated List
 * 4. Repeaters List
 * 5. Counselling Needed
 * 6. Block-Wise Count
 * 7. Line Department Count
 * 8. Class-Wise Count
 */
export function exportOverviewToExcel(
  allStudents: StudentRecord[],
  departments: DepartmentAbstract[],
  selectedMonth: string
) {
  const workbook = XLSX.utils.book_new();

  const appendSheetWithWidths = (sheetName: string, rows: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Status': 'No records available for this selection' }]);
    if (rows.length > 0) {
      const maxProps = Object.keys(rows[0] || {}).map(key => ({
        wch: Math.max(key.length, 14)
      }));
      worksheet['!cols'] = maxProps;
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  };

  // 1. Total Dropouts
  const totalDropoutsData = allStudents.map(formatStudentRecordForExcel);
  appendSheetWithWidths('Total Dropouts', totalDropoutsData);

  // 2. Re-Enrolled List
  const reEnrolledStudents = allStudents.filter(s => s.isReEnrolled);
  const reEnrolledData = reEnrolledStudents.map(formatStudentRecordForExcel);
  appendSheetWithWidths('Re-Enrolled List', reEnrolledData);

  // 3. Migrated List
  const migratedStudents = allStudents.filter(s => s.isMigrated);
  const migratedData = migratedStudents.map(formatStudentRecordForExcel);
  appendSheetWithWidths('Migrated List', migratedData);

  // 4. Repeaters List
  const repeaterStudents = allStudents.filter(s => s.isRepeater);
  const repeaterData = repeaterStudents.map(formatStudentRecordForExcel);
  appendSheetWithWidths('Repeaters List', repeaterData);

  // 5. Counselling Needed List
  const counsellingStudents = allStudents.filter(s => s.isCounsellingNeeded);
  const counsellingData = counsellingStudents.map(formatStudentRecordForExcel);
  appendSheetWithWidths('Counselling Needed', counsellingData);

  // 6. Block-Wise Count
  const blockMap: Record<string, {
    name: string;
    count: number;
    repeaters: number;
    reEnrolled: number;
    counsellingNeeded: number;
    migrated: number;
    statusNotUpdated: number;
  }> = {};

  allStudents.forEach(s => {
    const b = (s.block || 'Unspecified').trim() || 'Unspecified';
    if (!blockMap[b]) {
      blockMap[b] = {
        name: b,
        count: 0,
        repeaters: 0,
        reEnrolled: 0,
        counsellingNeeded: 0,
        migrated: 0,
        statusNotUpdated: 0,
      };
    }
    blockMap[b].count++;
    if (s.isRepeater) blockMap[b].repeaters++;
    if (s.isReEnrolled) blockMap[b].reEnrolled++;
    if (s.isCounsellingNeeded) blockMap[b].counsellingNeeded++;
    if (s.isMigrated) blockMap[b].migrated++;
    if (s.isStatusNotUpdated) blockMap[b].statusNotUpdated++;
  });

  const blockRows = Object.values(blockMap)
    .sort((a, b) => b.count - a.count)
    .map(b => ({
      'Educational Block': b.name,
      'Potential Dropouts': b.count,
      'Repeaters': b.repeaters,
      'Re-Enrolled': b.reEnrolled,
      'Counselling Needed': b.counsellingNeeded,
      'Migrated': b.migrated,
      'Status Not Updated': b.statusNotUpdated,
      'Block Share': allStudents.length > 0 ? ((b.count / allStudents.length) * 100).toFixed(1) + '%' : '0%',
    }));

  blockRows.push({
    'Educational Block': 'Total (All Blocks)',
    'Potential Dropouts': allStudents.length,
    'Repeaters': repeaterStudents.length,
    'Re-Enrolled': reEnrolledStudents.length,
    'Counselling Needed': counsellingStudents.length,
    'Migrated': migratedStudents.length,
    'Status Not Updated': allStudents.filter(s => s.isStatusNotUpdated).length,
    'Block Share': '100%',
  });
  appendSheetWithWidths('Block-Wise Count', blockRows);

  // 7. Line Department Count
  const standardDeptNames = [
    'Health Department', 'Labour Department', 'DCPO', 'Social Welfare',
    'Fisheries Department', 'Revenue Department', 'DDRO', 'DSE'
  ];
  const deptList = departments && departments.length > 0 ? departments : standardDeptNames.map(d => ({
    name: d,
    potentialDropout: allStudents.filter(s => s.lineDept === d).length,
    repeaters: allStudents.filter(s => s.lineDept === d && s.isRepeater).length,
    reEnrolled: allStudents.filter(s => s.lineDept === d && s.isReEnrolled).length,
    counsellingNeeded: allStudents.filter(s => s.lineDept === d && s.isCounsellingNeeded).length,
    migrated: allStudents.filter(s => s.lineDept === d && s.isMigrated).length,
    statusNotUpdated: allStudents.filter(s => s.lineDept === d && s.isStatusNotUpdated).length,
  }));

  const deptRows = deptList.map(d => ({
    'Line Department': d.name,
    'Potential Dropouts': d.potentialDropout,
    'Repeaters': d.repeaters,
    'Re-Enrolled': d.reEnrolled,
    'Counselling Needed': d.counsellingNeeded,
    'Migrated': d.migrated,
    'Status Not Updated': d.statusNotUpdated,
    'Department Share': allStudents.length > 0 ? ((d.potentialDropout / allStudents.length) * 100).toFixed(1) + '%' : '0%',
  }));

  const totalDeptDropouts = deptList.reduce((acc, d) => acc + d.potentialDropout, 0);
  const totalDeptRepeaters = deptList.reduce((acc, d) => acc + d.repeaters, 0);
  const totalDeptReEnrolled = deptList.reduce((acc, d) => acc + d.reEnrolled, 0);
  const totalDeptCounselling = deptList.reduce((acc, d) => acc + d.counsellingNeeded, 0);
  const totalDeptMigrated = deptList.reduce((acc, d) => acc + d.migrated, 0);
  const totalDeptNotUpdated = deptList.reduce((acc, d) => acc + d.statusNotUpdated, 0);

  deptRows.push({
    'Line Department': 'Total (All Line Departments)',
    'Potential Dropouts': totalDeptDropouts,
    'Repeaters': totalDeptRepeaters,
    'Re-Enrolled': totalDeptReEnrolled,
    'Counselling Needed': totalDeptCounselling,
    'Migrated': totalDeptMigrated,
    'Status Not Updated': totalDeptNotUpdated,
    'Department Share': '100%',
  });
  appendSheetWithWidths('Line Department Count', deptRows);

  // 8. Class-Wise Count
  const classMap: Record<string, {
    name: string;
    sortOrder: number;
    total: number;
    boys: number;
    girls: number;
    repeaters: number;
    reEnrolled: number;
    counsellingNeeded: number;
  }> = {};

  allStudents.forEach(s => {
    const rawStd = (s.std || '').trim();
    const stdNum = parseInt(rawStd, 10);
    const className = rawStd ? (rawStd.toLowerCase().startsWith('class') || rawStd.toLowerCase().startsWith('std') ? rawStd : `Class ${rawStd}`) : 'Unspecified';
    const sortOrder = !isNaN(stdNum) ? stdNum : 99;

    if (!classMap[className]) {
      classMap[className] = {
        name: className,
        sortOrder,
        total: 0,
        boys: 0,
        girls: 0,
        repeaters: 0,
        reEnrolled: 0,
        counsellingNeeded: 0,
      };
    }
    classMap[className].total++;
    const g = (s.gender || '').toLowerCase().trim();
    if (g === 'male' || g === 'boy' || g === 'm' || g.startsWith('m')) {
      classMap[className].boys++;
    } else if (g === 'female' || g === 'girl' || g === 'f' || g.startsWith('f')) {
      classMap[className].girls++;
    }
    if (s.isRepeater) classMap[className].repeaters++;
    if (s.isReEnrolled) classMap[className].reEnrolled++;
    if (s.isCounsellingNeeded) classMap[className].counsellingNeeded++;
  });

  const classRows = Object.values(classMap)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(c => ({
      'Standard / Class': c.name,
      'Potential Dropouts': c.total,
      'Boys (Male)': c.boys,
      'Girls (Female)': c.girls,
      'Repeaters': c.repeaters,
      'Re-Enrolled': c.reEnrolled,
      'Counselling Needed': c.counsellingNeeded,
      'Class Share': allStudents.length > 0 ? ((c.total / allStudents.length) * 100).toFixed(1) + '%' : '0%',
    }));

  const totalBoys = Object.values(classMap).reduce((acc, c) => acc + c.boys, 0);
  const totalGirls = Object.values(classMap).reduce((acc, c) => acc + c.girls, 0);

  classRows.push({
    'Standard / Class': 'Total (All Classes)',
    'Potential Dropouts': allStudents.length,
    'Boys (Male)': totalBoys,
    'Girls (Female)': totalGirls,
    'Repeaters': repeaterStudents.length,
    'Re-Enrolled': reEnrolledStudents.length,
    'Counselling Needed': counsellingStudents.length,
    'Class Share': '100%',
  });
  appendSheetWithWidths('Class-Wise Count', classRows);

  const cleanMonth = selectedMonth.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `Thoothukudi_Dropout_Comprehensive_Report_${cleanMonth}.xlsx`);
}

/**
 * Overview Word Export:
 * Generates an executive Microsoft Word (.doc) report with page breaks and sections:
 * - Executive KPI Overview
 * - Section 1: Block-Wise Breakdown Count Table
 * - Section 2: Line Department Count Table
 * - Section 3: Class-Wise Breakdown Count Table
 * - Section 4: Re-Enrolled Students List
 * - Section 5: Migrated Students List
 * - Section 6: Repeaters Students List
 * - Section 7: Counselling Needed Students List
 * - Section 8: Total Potential Dropout Students Master List
 */
export function exportOverviewToWord(
  allStudents: StudentRecord[],
  departments: DepartmentAbstract[],
  selectedMonth: string
) {
  const reEnrolledStudents = allStudents.filter(s => s.isReEnrolled);
  const migratedStudents = allStudents.filter(s => s.isMigrated);
  const repeaterStudents = allStudents.filter(s => s.isRepeater);
  const counsellingStudents = allStudents.filter(s => s.isCounsellingNeeded);
  const statusNotUpdatedStudents = allStudents.filter(s => s.isStatusNotUpdated);

  // Helper for rendering a student list table
  const renderStudentRowsWord = (students: StudentRecord[]) => {
    if (students.length === 0) {
      return '<tr><td colspan="15" style="border:1px solid #cbd5e1;padding:8px;text-align:center;color:#64748b;font-style:italic;">No student records found in this category.</td></tr>';
    }
    return students.map((s, index) => `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;text-align:center;">${s.sNo || index + 1}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;font-weight:bold;">${s.studentName}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.emisId || '-'}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.division}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.taluk}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.block}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.school}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">Std ${s.std} ${s.sec ? `(${s.sec})` : ''}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;text-align:center;">${s.absentDays || '-'}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;text-align:center;">${s.gender}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.contactNo || '-'}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.lineDept}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.dropoutReason || '-'}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;font-weight:bold;color:${s.isReEnrolled ? '#047857' : s.isMigrated ? '#b45309' : '#1e3a5f'};">${s.status}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.brteRemarks || '-'}</td>
        <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.deptRemarks || '-'}</td>
      </tr>
    `).join('');
  };

  const studentTableHeader = `
    <thead>
      <tr>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;text-align:center;border:1px solid #1e3a5f;">S.No</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">Student Name</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">EMIS ID</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">Division</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">Taluk</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">Block</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">School</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">Class</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;text-align:center;border:1px solid #1e3a5f;">Absent Days</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;text-align:center;border:1px solid #1e3a5f;">Gender</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">Contact No</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">Line Dept</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">Dropout Reason</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">Present Status</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">BRTE / HM Remarks</th>
        <th style="background-color:#1e3a5f;color:#ffffff;padding:6px;font-size:10px;border:1px solid #1e3a5f;">Dept Remarks</th>
      </tr>
    </thead>
  `;

  // Blockwise data preparation
  const blockMap: Record<string, {
    name: string;
    count: number;
    repeaters: number;
    reEnrolled: number;
    counsellingNeeded: number;
    migrated: number;
  }> = {};

  allStudents.forEach(s => {
    const b = (s.block || 'Unspecified').trim() || 'Unspecified';
    if (!blockMap[b]) {
      blockMap[b] = { name: b, count: 0, repeaters: 0, reEnrolled: 0, counsellingNeeded: 0, migrated: 0 };
    }
    blockMap[b].count++;
    if (s.isRepeater) blockMap[b].repeaters++;
    if (s.isReEnrolled) blockMap[b].reEnrolled++;
    if (s.isCounsellingNeeded) blockMap[b].counsellingNeeded++;
    if (s.isMigrated) blockMap[b].migrated++;
  });

  const blockRowsHtml = Object.values(blockMap)
    .sort((a, b) => b.count - a.count)
    .map(b => {
      const pct = allStudents.length > 0 ? ((b.count / allStudents.length) * 100).toFixed(1) + '%' : '0%';
      return `
        <tr>
          <td style="border:1px solid #cbd5e1;padding:6px;font-weight:bold;">${b.name}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;font-weight:bold;">${b.count}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${b.repeaters}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;color:#047857;font-weight:bold;">${b.reEnrolled}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;color:#be123c;">${b.counsellingNeeded}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${b.migrated}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${pct}</td>
        </tr>
      `;
    }).join('');

  // Department data preparation
  const standardDeptNames = [
    'Health Department', 'Labour Department', 'DCPO', 'Social Welfare',
    'Fisheries Department', 'Revenue Department', 'DDRO', 'DSE'
  ];
  const deptList = departments && departments.length > 0 ? departments : standardDeptNames.map(d => ({
    name: d,
    potentialDropout: allStudents.filter(s => s.lineDept === d).length,
    repeaters: allStudents.filter(s => s.lineDept === d && s.isRepeater).length,
    reEnrolled: allStudents.filter(s => s.lineDept === d && s.isReEnrolled).length,
    counsellingNeeded: allStudents.filter(s => s.lineDept === d && s.isCounsellingNeeded).length,
    migrated: allStudents.filter(s => s.lineDept === d && s.isMigrated).length,
    statusNotUpdated: allStudents.filter(s => s.lineDept === d && s.isStatusNotUpdated).length,
  }));

  const deptRowsHtml = deptList.map(d => {
    const pct = allStudents.length > 0 ? ((d.potentialDropout / allStudents.length) * 100).toFixed(1) + '%' : '0%';
    return `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:6px;font-weight:bold;">${d.name}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;font-weight:bold;">${d.potentialDropout}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${d.repeaters}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;color:#047857;font-weight:bold;">${d.reEnrolled}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;color:#be123c;">${d.counsellingNeeded}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${d.migrated}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${d.statusNotUpdated}</td>
        <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${pct}</td>
      </tr>
    `;
  }).join('');

  // Classwise data preparation
  const classMap: Record<string, {
    name: string;
    sortOrder: number;
    total: number;
    boys: number;
    girls: number;
    repeaters: number;
    reEnrolled: number;
    counsellingNeeded: number;
  }> = {};

  allStudents.forEach(s => {
    const rawStd = (s.std || '').trim();
    const stdNum = parseInt(rawStd, 10);
    const className = rawStd ? (rawStd.toLowerCase().startsWith('class') || rawStd.toLowerCase().startsWith('std') ? rawStd : `Class ${rawStd}`) : 'Unspecified';
    const sortOrder = !isNaN(stdNum) ? stdNum : 99;

    if (!classMap[className]) {
      classMap[className] = {
        name: className,
        sortOrder,
        total: 0,
        boys: 0,
        girls: 0,
        repeaters: 0,
        reEnrolled: 0,
        counsellingNeeded: 0,
      };
    }
    classMap[className].total++;
    const g = (s.gender || '').toLowerCase().trim();
    if (g === 'male' || g === 'boy' || g === 'm' || g.startsWith('m')) {
      classMap[className].boys++;
    } else if (g === 'female' || g === 'girl' || g === 'f' || g.startsWith('f')) {
      classMap[className].girls++;
    }
    if (s.isRepeater) classMap[className].repeaters++;
    if (s.isReEnrolled) classMap[className].reEnrolled++;
    if (s.isCounsellingNeeded) classMap[className].counsellingNeeded++;
  });

  const classRowsHtml = Object.values(classMap)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(c => {
      const pct = allStudents.length > 0 ? ((c.total / allStudents.length) * 100).toFixed(1) + '%' : '0%';
      return `
        <tr>
          <td style="border:1px solid #cbd5e1;padding:6px;font-weight:bold;">${c.name}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;font-weight:bold;">${c.total}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${c.boys}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${c.girls}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${c.repeaters}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;color:#047857;font-weight:bold;">${c.reEnrolled}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;color:#be123c;">${c.counsellingNeeded}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${pct}</td>
        </tr>
      `;
    }).join('');

  const totalBoys = Object.values(classMap).reduce((acc, c) => acc + c.boys, 0);
  const totalGirls = Object.values(classMap).reduce((acc, c) => acc + c.girls, 0);

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'>
    <title>Thoothukudi District - Comprehensive Potential Dropout Report (${selectedMonth})</title>
    <style>
      body { font-family: 'Times New Roman', Times, serif; margin: 24px; color: #1e293b; font-size: 11px; }
      h1 { color: #1e3a5f; margin-bottom: 2px; font-size: 20px; font-weight: bold; }
      h2 { color: #1e3a5f; margin-top: 20px; margin-bottom: 8px; font-size: 15px; border-bottom: 2px solid #1e3a5f; padding-bottom: 4px; }
      .meta { color: #475569; margin-bottom: 16px; font-size: 12px; }
      table { border-collapse: collapse; width: 100%; margin-top: 8px; margin-bottom: 16px; }
      th { background-color: #1e3a5f; color: #ffffff; padding: 6px; text-align: left; font-size: 10px; font-weight: bold; border: 1px solid #1e3a5f; }
      td { border: 1px solid #cbd5e1; padding: 5px; font-size: 10px; }
      .summary-box { display: inline-block; padding: 10px 14px; margin-right: 10px; margin-bottom: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; }
      .summary-val { font-size: 18px; font-weight: bold; color: #1e3a5f; }
      .page-break { page-break-before: always; mso-break-type: section-break; }
    </style>
    </head>
    <body>
      <h1>Thoothukudi District Administration</h1>
      <div style="font-size: 14px; font-weight: bold; color: #047857; margin-bottom: 4px;">Potential Dropout Comprehensive Monitoring Report</div>
      <div class="meta">Month: <strong>${selectedMonth}</strong> | Total Dropouts: <strong>${allStudents.length}</strong> | Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>

      <div style="margin-bottom: 16px;">
        <div class="summary-box"><div>Total Potential Dropouts</div><div class="summary-val">${allStudents.length}</div></div>
        <div class="summary-box"><div>Re-Enrolled in School</div><div class="summary-val" style="color:#047857;">${reEnrolledStudents.length}</div></div>
        <div class="summary-box"><div>Migrated</div><div class="summary-val" style="color:#b45309;">${migratedStudents.length}</div></div>
        <div class="summary-box"><div>Repeaters Caseload</div><div class="summary-val" style="color:#6d28d9;">${repeaterStudents.length}</div></div>
        <div class="summary-box"><div>Counselling Needed</div><div class="summary-val" style="color:#be123c;">${counsellingStudents.length}</div></div>
      </div>

      <!-- 1. Block-Wise Count Table -->
      <h2>1. Educational Block-Wise Breakdown Count (${Object.keys(blockMap).length} Blocks)</h2>
      <table>
        <thead>
          <tr>
            <th>Educational Block</th>
            <th style="text-align:center;">Potential Dropouts</th>
            <th style="text-align:center;">Repeaters</th>
            <th style="text-align:center;">Re-Enrolled</th>
            <th style="text-align:center;">Counselling Needed</th>
            <th style="text-align:center;">Migrated</th>
            <th style="text-align:center;">Block Share</th>
          </tr>
        </thead>
        <tbody>
          ${blockRowsHtml}
          <tr style="background:#e2e8f0;font-weight:bold;">
            <td style="border:1px solid #94a3b8;padding:6px;">Total (All Blocks)</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${allStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${repeaterStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;color:#047857;">${reEnrolledStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;color:#be123c;">${counsellingStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${migratedStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">100%</td>
          </tr>
        </tbody>
      </table>

      <!-- Page Break to Line Department Count -->
      <br style="page-break-before: always; clear: both; mso-break-type: section-break;" />

      <!-- 2. Line Department Count Table -->
      <h2>2. Line Department Distribution Count (${deptList.length} Departments)</h2>
      <table>
        <thead>
          <tr>
            <th>Line Department</th>
            <th style="text-align:center;">Potential Dropouts</th>
            <th style="text-align:center;">Repeaters</th>
            <th style="text-align:center;">Re-Enrolled</th>
            <th style="text-align:center;">Counselling Needed</th>
            <th style="text-align:center;">Migrated</th>
            <th style="text-align:center;">Status Not Updated</th>
            <th style="text-align:center;">Share</th>
          </tr>
        </thead>
        <tbody>
          ${deptRowsHtml}
          <tr style="background:#e2e8f0;font-weight:bold;">
            <td style="border:1px solid #94a3b8;padding:6px;">Total (All Line Departments)</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${allStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${repeaterStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;color:#047857;">${reEnrolledStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;color:#be123c;">${counsellingStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${migratedStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${statusNotUpdatedStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">100%</td>
          </tr>
        </tbody>
      </table>

      <!-- Page Break to Class-Wise Count -->
      <br style="page-break-before: always; clear: both; mso-break-type: section-break;" />

      <!-- 3. Class-Wise Count Table -->
      <h2>3. Standard / Class-Wise Breakdown Count</h2>
      <table>
        <thead>
          <tr>
            <th>Standard / Class</th>
            <th style="text-align:center;">Potential Dropouts</th>
            <th style="text-align:center;">Boys (Male)</th>
            <th style="text-align:center;">Girls (Female)</th>
            <th style="text-align:center;">Repeaters</th>
            <th style="text-align:center;">Re-Enrolled</th>
            <th style="text-align:center;">Counselling Needed</th>
            <th style="text-align:center;">Class Share</th>
          </tr>
        </thead>
        <tbody>
          ${classRowsHtml}
          <tr style="background:#e2e8f0;font-weight:bold;">
            <td style="border:1px solid #94a3b8;padding:6px;">Total (All Classes)</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${allStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${totalBoys}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${totalGirls}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">${repeaterStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;color:#047857;">${reEnrolledStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;color:#be123c;">${counsellingStudents.length}</td>
            <td style="border:1px solid #94a3b8;padding:6px;text-align:center;">100%</td>
          </tr>
        </tbody>
      </table>

      <!-- Page Break to Re-Enrolled Students List -->
      <br style="page-break-before: always; clear: both; mso-break-type: section-break;" />

      <!-- 4. Re-Enrolled Students List -->
      <h2>4. Re-Enrolled Students List (${reEnrolledStudents.length} Students)</h2>
      <table>
        ${studentTableHeader}
        <tbody>
          ${renderStudentRowsWord(reEnrolledStudents)}
        </tbody>
      </table>

      <!-- Page Break to Migrated Students List -->
      <br style="page-break-before: always; clear: both; mso-break-type: section-break;" />

      <!-- 5. Migrated Students List -->
      <h2>5. Migrated Students List (${migratedStudents.length} Students)</h2>
      <table>
        ${studentTableHeader}
        <tbody>
          ${renderStudentRowsWord(migratedStudents)}
        </tbody>
      </table>

      <!-- Page Break to Repeaters Students List -->
      <br style="page-break-before: always; clear: both; mso-break-type: section-break;" />

      <!-- 6. Repeaters Students List -->
      <h2>6. Repeaters Students List (${repeaterStudents.length} Students)</h2>
      <table>
        ${studentTableHeader}
        <tbody>
          ${renderStudentRowsWord(repeaterStudents)}
        </tbody>
      </table>

      <!-- Page Break to Counselling Needed Students List -->
      <br style="page-break-before: always; clear: both; mso-break-type: section-break;" />

      <!-- 7. Counselling Needed Students List -->
      <h2>7. Counselling Needed Students List (${counsellingStudents.length} Students)</h2>
      <table>
        ${studentTableHeader}
        <tbody>
          ${renderStudentRowsWord(counsellingStudents)}
        </tbody>
      </table>

      <!-- Page Break to Master Total Dropout List -->
      <br style="page-break-before: always; clear: both; mso-break-type: section-break;" />

      <!-- 8. Total Dropout Master List -->
      <h2>8. Total Potential Dropout Master List (${allStudents.length} Students)</h2>
      <table>
        ${studentTableHeader}
        <tbody>
          ${renderStudentRowsWord(allStudents)}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanMonth = selectedMonth.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `Thoothukudi_Dropout_Comprehensive_Report_${cleanMonth}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


