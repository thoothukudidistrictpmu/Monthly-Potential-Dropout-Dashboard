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
    'Remarks / Notes': s.remarks || '-',
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
    'Remarks / Notes': s.remarks || '-',
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
      <td style="border:1px solid #cbd5e1;padding:6px;font-size:11px;">${s.remarks || '-'}</td>
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
            <th>Remarks</th>
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

