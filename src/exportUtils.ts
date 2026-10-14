import * as XLSX from 'xlsx';
import { StudentRecord, DepartmentAbstract } from './sheetData';

export function exportStudentsToExcel(students: StudentRecord[], filename: string) {
  const exportData = students.map((s, index) => ({
    'S.No': s.sNo || index + 1,
    'Division Name': s.division,
    'Taluk Name': s.taluk,
    'Block Name': s.block,
    'School Name': s.school,
    'Category': s.category,
    'EMIS ID': s.emisId,
    'Student Name': s.studentName,
    'Gender': s.gender,
    'Standard': s.std,
    'Section': s.sec,
    'Address': s.address,
    'Contact No': s.contactNo,
    'Repeater or Not': s.repeaterStatus,
    'Line Department': s.lineDept,
    'Dropout Reason': s.dropoutReason,
    'Counselling Required': s.counsellingRequired,
    'Present Status': s.status,
    'Remarks / Notes': s.remarks,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  
  // Auto-fit column widths
  const maxProps = Object.keys(exportData[0] || {}).map(key => ({
    wch: Math.max(key.length, 12)
  }));
  worksheet['!cols'] = maxProps;

  XLSX.writeFile(workbook, `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`);
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
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.sNo || index + 1}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.division}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.taluk}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.block}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.school}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.emisId}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;font-weight:bold;">${s.studentName}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.gender}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">Std ${s.std} ${s.sec ? `(${s.sec})` : ''}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.repeaterStatus}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.lineDept}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.counsellingRequired}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;font-weight:bold;color:#047857;">${s.status}</td>
      <td style="border:1px solid #cbd5e1;padding:5px;font-size:10px;">${s.remarks || '-'}</td>
    </tr>
  `).join('');

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'>
    <title>${title}</title>
    <style>
      body { font-family: 'Times New Roman', Times, serif; margin: 24px; color: #1e293b; }
      h2 { color: #1e3a5f; margin-bottom: 2px; font-size: 18px; }
      h3 { color: #334155; margin-top: 2px; margin-bottom: 8px; font-size: 13px; font-weight: normal; }
      table { border-collapse: collapse; width: 100%; margin-top: 12px; }
      th { background-color: #1e3a5f; color: #ffffff; padding: 6px; text-align: left; font-size: 10px; border: 1px solid #1e3a5f; }
    </style>
    </head>
    <body>
      <h2>Thoothukudi District - Potential Dropout Dashboard</h2>
      <h3>${title} | Total Records: ${students.length} | Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</h3>
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Division</th>
            <th>Taluk</th>
            <th>Block</th>
            <th>School</th>
            <th>EMIS ID</th>
            <th>Student Name</th>
            <th>Gender</th>
            <th>Class</th>
            <th>Repeater</th>
            <th>Line Dept</th>
            <th>Counselling</th>
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
  // Generates Word/Docs compatible HTML document format (.doc)
  exportStudentsToWord(students, title);
}
