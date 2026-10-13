// Shared Google Sheets Data Fetcher and Processor
// This module works in both Node.js (Vercel Serverless Functions / Express) and browser clients.

export const SPREADSHEET_ID = '1QaxFBlOUpkGU2ZraBCcUooFmgXVV4vVuN4WdionZUKk';

export const MONTH_TABS: Record<string, string> = {
  'Sep 26': '419562693',
  'Oct 26': '808537006',
  'Nov 26': '695314108',
};

// Department Guidelines from District Collector Category Reference
export const DEPT_GUIDELINES: Record<string, string> = {
  'Health Department': 'Students who are psychologically affected or need emotional support are to be given appropriate counselling. Two lists to be maintained: (i) willing to rejoin school and need counselling, (ii) not willing to rejoin and need counselling.',
  'Labour Department': 'Students identified by the Labour Department as unwilling to continue education are to be added to the Revenue Department list for further follow-up and intervention.',
  'DCPO': 'Caseload found high relative to available staff strength. Verified/corrected list needing Child Protection Dept intervention to be shared with District Child Protection Unit; remaining students added to Revenue Dept list.',
  'Social Welfare': 'Targeted adolescent girl support, early marriage prevention, and family welfare counseling through District Social Welfare officers.',
  'Fisheries Department': 'Potential dropout list downloaded from EMIS. 10 days given to BRC-level OoSC Coordinator to verify. Where interested, link students to ITI courses. Where dropout is linked to fishing occupation, inspect parents boats and issue notice where required.',
  'Revenue Department': 'Taluk-level administrative tracking, residential migration tracing, community certificate facilitation, and inter-departmental joint visits.',
  'DDRO': 'District Differently Abled Welfare Office: UDID card issuance, CWSN special assistance, and specialized bridge learning support.',
  'DSE': 'Directorate of School Education: Headmaster follow-up, school re-enrollment drives, and academic bridge support.',
};

export const DIVISION_BLOCKS: Record<string, string[]> = {
  'Division 1 (Kovilpatti)': ['Kovilpatti', 'Kayathar', 'Vilathikulam', 'Pudur', 'Ottapidaram'],
  'Division 2 (Thoothukudi)': ['Thoothukudi Urban', 'Thoothukudi Rural', 'Karunkulam', 'Srivaikundam'],
  'Division 3 (Tiruchendur)': ['Thiruchenthur', 'Alwarthirunagari', 'Sathankulam', 'Udangudi'],
};

// Helper to safely parse CSV with quoted cells containing commas/newlines
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      currentRow.push(currentVal.trim());
      currentVal = '';
      if (currentRow.some(col => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += c;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(col => col.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

export interface StudentRecord {
  sNo: number;
  division: string;
  block: string;
  school: string;
  category: string;
  emisId: string;
  studentName: string;
  gender: string;
  std: string;
  sec: string;
  lineDept: string;
  repeaterStatus: string;
  status: string;
  remarks: string;
}

export interface DashboardPayload {
  selectedMonth: string;
  summary: {
    potentialDropout: number;
    readmitted: number;
    migrated: number;
    repeaters: number;
  };
  charts: {
    blockWise: Array<{ name: string; count: number }>;
    lineDepartment: Array<{ name: string; count: number; fullName: string }>;
    classWise: Array<{ name: string; value: number; count: number; sortOrder: number }>;
  };
  blockData: Array<{ name: string; count: number }>;
  lineDepartmentData: Array<{ name: string; count: number; fullName: string }>;
  classData: Array<{ name: string; value: number; count: number; sortOrder: number }>;
  students: StudentRecord[];
  departments: Array<{
    id: string;
    name: string;
    guideline: string;
    count: number;
    students: StudentRecord[];
  }>;
  divisions: Array<{
    name: string;
    totalStudents: number;
    repeaters: number;
    blocks: Array<{ name: string; count: number }>;
  }>;
  studentsCount: number;
}

export function processSheetCSV(csvText: string, month: string): DashboardPayload {
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    throw new Error('Spreadsheet returned empty or insufficient rows.');
  }

  const students: StudentRecord[] = [];
  const blockCounts: Record<string, number> = {};
  const classCounts: Record<string, number> = {};
  const deptCounts: Record<string, number> = {
    'Health Department': 0,
    'Labour Department': 0,
    'DCPO': 0,
    'Social Welfare': 0,
    'Fisheries Department': 0,
    'Revenue Department': 0,
    'DDRO': 0,
    'DSE': 0,
  };

  let totalRepeaters = 0;
  let totalReadmitted = 0;
  let totalMigrated = 0;

  // Row 0 is header, rows 1..N are data
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const sNo = r[0];
    const blockRaw = r[2] || '';
    const studentName = r[6] || '';

    // Valid student check (must have student name or block populated)
    if (!studentName && !blockRaw) continue;

    // Normalize block name
    let block = blockRaw.trim();
    if (block === 'Alwarthirunagar') block = 'Alwarthirunagari';
    if (!block) block = 'Unassigned';

    blockCounts[block] = (blockCounts[block] || 0) + 1;

    // Class / Standard
    const rawStd = (r[8] || '').trim();
    const stdNum = parseInt(rawStd, 10);
    const stdKey = stdNum ? `Class ${stdNum}` : rawStd ? `Class ${rawStd}` : 'Other';
    classCounts[stdKey] = (classCounts[stdKey] || 0) + 1;

    // Repeater or Not (Col 12)
    const repeaterVal = (r[12] || '').trim();
    const isRepeater = repeaterVal.toLowerCase() === 'repeater';
    if (isRepeater) totalRepeaters++;

    // Status (Col 14) or Remarks (Col 15)
    const statusVal = (r[14] || '').toLowerCase();
    const remarksVal = (r[15] || '').toLowerCase();
    if (statusVal.includes('readmit') || statusVal.includes('re-enroll') || remarksVal.includes('readmit')) {
      totalReadmitted++;
    }
    if (statusVal.includes('migrat') || remarksVal.includes('migrat')) {
      totalMigrated++;
    }

    // Line Department (Col 10)
    const lineDeptRaw = (r[10] || '').trim();
    let assignedDept = 'Unassigned';
    if (lineDeptRaw) {
      const clean = lineDeptRaw.toLowerCase();
      if (clean.includes('health') || clean.includes('medical')) assignedDept = 'Health Department';
      else if (clean.includes('labour') || clean.includes('labor') || clean.includes('employ')) assignedDept = 'Labour Department';
      else if (clean.includes('dcpo') || clean.includes('child protect')) assignedDept = 'DCPO';
      else if (clean.includes('social welfare') || clean.includes('dsw')) assignedDept = 'Social Welfare';
      else if (clean.includes('fisher') || clean.includes('boat')) assignedDept = 'Fisheries Department';
      else if (clean.includes('revenue') || clean.includes('taluk')) assignedDept = 'Revenue Department';
      else if (clean.includes('ddro') || clean.includes('differently') || clean.includes('disabled') || clean.includes('cwsn')) assignedDept = 'DDRO';
      else if (clean.includes('dse') || clean.includes('school education') || clean.includes('education dept')) assignedDept = 'DSE';
      else {
        for (const deptKey of Object.keys(deptCounts)) {
          const keyLower = deptKey.toLowerCase();
          const shortKey = keyLower.replace(' department', '');
          if (clean === keyLower || clean === shortKey || clean.includes(shortKey) || keyLower.includes(clean)) {
            assignedDept = deptKey;
            break;
          }
        }
      }
      if (assignedDept !== 'Unassigned' && deptCounts[assignedDept] !== undefined) {
        deptCounts[assignedDept]++;
      }
    }

    // Determine Division
    let division = 'Division 2 (Thoothukudi)';
    if (DIVISION_BLOCKS['Division 1 (Kovilpatti)'].includes(block)) {
      division = 'Division 1 (Kovilpatti)';
    } else if (DIVISION_BLOCKS['Division 3 (Tiruchendur)'].includes(block)) {
      division = 'Division 3 (Tiruchendur)';
    }

    students.push({
      sNo: parseInt(sNo, 10) || students.length + 1,
      division,
      block,
      school: r[3] || 'Government School',
      category: r[4] || 'School',
      emisId: r[5] || '',
      studentName,
      gender: r[7] || '-',
      std: rawStd || '-',
      sec: r[9] || '-',
      lineDept: assignedDept,
      repeaterStatus: repeaterVal || 'Not updated',
      status: r[14] || 'Active Verification',
      remarks: r[15] || '',
    });
  }

  // Convert block counts to sorted array for bar chart
  const blockData = Object.entries(blockCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Convert line department counts to array for bar chart
  const lineDepartmentData = [
    { name: 'DCPO', count: deptCounts['DCPO'], fullName: 'District Child Protection Unit (DCPO)' },
    { name: 'Revenue', count: deptCounts['Revenue Department'], fullName: 'Revenue Department' },
    { name: 'Health', count: deptCounts['Health Department'], fullName: 'Health Department' },
    { name: 'Fisheries', count: deptCounts['Fisheries Department'], fullName: 'Fisheries Department' },
    { name: 'Labour', count: deptCounts['Labour Department'], fullName: 'Labour Department' },
    { name: 'Social Welfare', count: deptCounts['Social Welfare'], fullName: 'Social Welfare Department' },
    { name: 'DDRO', count: deptCounts['DDRO'], fullName: 'District Differently Abled Welfare Office' },
    { name: 'DSE', count: deptCounts['DSE'], fullName: 'Directorate of School Education' },
  ];

  // Convert class counts to array for bar chart (ordered Std 1 to 12)
  const classData = Object.entries(classCounts)
    .map(([name, value]) => ({
      name,
      value,
      count: value,
      sortOrder: parseInt(name.replace('Class ', ''), 10) || 99,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Division breakdowns
  const divisionSummary = Object.entries(DIVISION_BLOCKS).map(([divName, blocks]) => {
    const divStudents = students.filter(s => blocks.includes(s.block));
    const divRepeaters = divStudents.filter(s => s.repeaterStatus.toLowerCase() === 'repeater').length;
    const blockList = blocks.map(b => ({
      name: b,
      count: blockCounts[b] || 0,
    }));
    return {
      name: divName,
      totalStudents: divStudents.length,
      repeaters: divRepeaters,
      blocks: blockList,
    };
  });

  return {
    selectedMonth: month,
    summary: {
      potentialDropout: students.length,
      readmitted: totalReadmitted,
      migrated: totalMigrated,
      repeaters: totalRepeaters,
    },
    charts: {
      blockWise: blockData,
      lineDepartment: lineDepartmentData,
      classWise: classData,
    },
    blockData,
    lineDepartmentData,
    classData,
    students,
    departments: Object.keys(deptCounts).map(deptName => {
      const deptStudents = students.filter(s => s.lineDept === deptName);
      return {
        id: deptName.toLowerCase().replace(/\s+/g, '-'),
        name: deptName,
        guideline: DEPT_GUIDELINES[deptName] || 'Inter-departmental follow-up in progress.',
        count: deptStudents.length,
        students: deptStudents,
      };
    }),
    divisions: divisionSummary,
    studentsCount: students.length,
  };
}
