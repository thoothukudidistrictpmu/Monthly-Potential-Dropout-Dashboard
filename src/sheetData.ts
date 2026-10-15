// Shared Google Sheets Data Fetcher and Processor
// This module works in both Node.js (Vercel Serverless Functions / Express) and browser clients.

export const SPREADSHEET_ID = '1QaxFBlOUpkGU2ZraBCcUooFmgXVV4vVuN4WdionZUKk';

export const MONTH_TABS: Record<string, string> = {
  'Sep 2026': '419562693',
  'Oct 2026': '808537006',
  'Nov 2026': '695314108',
  // Backward compatibility aliases
  'Sep 26': '419562693',
  'Oct 26': '808537006',
  'Nov 26': '695314108',
};

export const AVAILABLE_MONTHS = ['Sep 2026', 'Oct 2026', 'Nov 2026'];

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
  'Kovilpatti': ['Kovilpatti', 'Kayathar', 'Vilathikulam', 'Pudur', 'Ottapidaram'],
  'Thoothukudi': ['Thoothukudi Urban', 'Thoothukudi Rural', 'Karunkulam', 'Srivaikundam'],
  'Tiruchendur': ['Thiruchenthur', 'Alwarthirunagari', 'Sathankulam', 'Udangudi'],
};

// Block to Taluk Mapping for Thoothukudi District
export const BLOCK_TO_TALUK_MAP: Record<string, string> = {
  'Thiruchenthur': 'Tiruchendur',
  'Tiruchendur': 'Tiruchendur',
  'Alwarthirunagari': 'Eral',
  'Sathankulam': 'Sathankulam',
  'Udangudi': 'Tiruchendur',
  'Kovilpatti': 'Kovilpatti',
  'Kayathar': 'Kayathar',
  'Vilathikulam': 'Vilathikulam',
  'Pudur': 'Vilathikulam',
  'Ottapidaram': 'Ottapidaram',
  'Thoothukudi Urban': 'Thoothukudi',
  'Thoothukudi Rural': 'Thoothukudi',
  'Karunkulam': 'Srivaikundam',
  'Srivaikundam': 'Srivaikundam',
};

// Credentials from Google Sheet 'User and Password' tab
export interface DepartmentCredential {
  departmentName: string;
  userId: string;
  password: string;
}

export const DEFAULT_DEPARTMENT_CREDENTIALS: Record<string, DepartmentCredential> = {
  'Health Department': { departmentName: 'Health Department', userId: 'health_dept', password: 'Heal@123' },
  'Labour Department': { departmentName: 'Labour Department', userId: 'labour_dept', password: 'Labo@123' },
  'DCPO': { departmentName: 'District Child Protection', userId: 'childprotection_dept', password: 'Chil@123' },
  'Social Welfare': { departmentName: 'Social Welfare Department', userId: 'socialwelfare_dept', password: 'Soci@123' },
  'Fisheries Department': { departmentName: 'Fisheries Department', userId: 'fisheries_dept', password: 'Fish@123' },
  'Revenue Department': { departmentName: 'Revenue Department', userId: 'revenue_dept', password: 'Reve@123' },
  'DDRO': { departmentName: 'DDRO', userId: 'ddro_dept', password: 'Ddro@123' },
  'DSE': { departmentName: 'DSE', userId: 'dse_dept', password: 'Dsep@123' },
};

export function matchDepartmentToSlicer(rawName: string): string | null {
  const clean = rawName.toLowerCase().trim();
  if (clean.includes('health') || clean.includes('medical')) return 'Health Department';
  if (clean.includes('labour') || clean.includes('labor') || clean.includes('employ')) return 'Labour Department';
  if (clean.includes('child protection') || clean.includes('dcpo') || clean.includes('dcpu')) return 'DCPO';
  if (clean.includes('social welfare') || clean.includes('dsw')) return 'Social Welfare';
  if (clean.includes('fisher') || clean.includes('boat')) return 'Fisheries Department';
  if (clean.includes('revenue') || clean.includes('taluk')) return 'Revenue Department';
  if (clean.includes('ddro') || clean.includes('differently') || clean.includes('disabled') || clean.includes('cwsn')) return 'DDRO';
  if (clean.includes('dse') || clean.includes('school education') || clean.includes('education')) return 'DSE';
  return null;
}

export function parseCredentialsCSV(csvText: string): Record<string, DepartmentCredential> {
  const rows = parseCSV(csvText);
  const result: Record<string, DepartmentCredential> = { ...DEFAULT_DEPARTMENT_CREDENTIALS };
  if (!rows || rows.length < 2) return result;

  // Header row is index 0 ("Department Name", "User Id", "Password")
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;
    const deptName = (row[0] || '').trim();
    const userId = (row[1] || '').trim();
    const password = (row[2] || '').trim();
    if (!deptName || !userId || !password) continue;

    const matchedSlicer = matchDepartmentToSlicer(deptName);
    if (matchedSlicer) {
      result[matchedSlicer] = { departmentName: deptName, userId, password };
    }
  }
  return result;
}

export async function fetchLiveCredentials(): Promise<Record<string, DepartmentCredential>> {
  try {
    const directUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('User and Password')}`;
    const res = await fetch(directUrl);
    if (!res.ok) {
      return DEFAULT_DEPARTMENT_CREDENTIALS;
    }
    const csv = await res.text();
    return parseCredentialsCSV(csv);
  } catch (err) {
    console.warn('Could not fetch live credentials, using default config:', err);
    return DEFAULT_DEPARTMENT_CREDENTIALS;
  }
}


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
  taluk: string;
  block: string;
  school: string;
  category: string;
  emisId: string;
  studentName: string;
  gender: string;
  std: string;
  sec: string;
  address: string;
  contactNo: string;
  repeaterStatus: string;
  isRepeater: boolean;
  lineDept: string;
  dropoutReason: string;
  counsellingRequired: string;
  isCounsellingNeeded: boolean;
  status: string;
  isReEnrolled: boolean;
  isMigrated: boolean;
  isStatusNotUpdated: boolean;
  remarks: string;
  customFields?: Record<string, string>;
}

export interface DepartmentAbstract {
  id: string;
  name: string;
  fullName: string;
  potentialDropout: number;
  repeaters: number;
  reEnrolled: number;
  counsellingNeeded: number;
  statusNotUpdated: number;
  migrated: number;
  students: StudentRecord[];
}

export interface TalukSummary {
  name: string;
  potentialDropout: number;
  repeaters: number;
  reEnrolled: number;
  counsellingNeeded: number;
  statusNotUpdated: number;
  migrated: number;
  students: StudentRecord[];
}

export interface DashboardPayload {
  selectedMonth: string;
  availableMonths: string[];
  availableHeaders?: string[];
  summary: {
    potentialDropout: number;
    readmitted: number;
    migrated: number;
    repeaters: number;
    reEnrolled: number;
    counsellingNeeded: number;
    statusNotUpdated: number;
  };
  charts: {
    blockWise: Array<{ name: string; count: number }>;
    lineDepartment: Array<{ name: string; count: number; fullName: string }>;
    classWise: Array<{ name: string; value: number; count: number; boys: number; girls: number; total: number; sortOrder: number }>;
  };
  blockData: Array<{ name: string; count: number }>;
  lineDepartmentData: Array<{ name: string; count: number; fullName: string }>;
  classData: Array<{ name: string; value: number; count: number; boys: number; girls: number; total: number; sortOrder: number }>;
  students: StudentRecord[];
  departments: Array<{
    id: string;
    name: string;
    guideline: string;
    count: number;
    potentialDropout: number;
    repeaters: number;
    reEnrolled: number;
    counsellingNeeded: number;
    statusNotUpdated: number;
    migrated: number;
    students: StudentRecord[];
  }>;
  allLineDepartmentsAbstract: DepartmentAbstract[];
  talukSummaries: TalukSummary[];
  divisions: Array<{
    name: string;
    totalStudents: number;
    repeaters: number;
    reEnrolled: number;
    counsellingNeeded: number;
    blocks: Array<{
      name: string;
      count: number;
      repeaters: number;
      reEnrolled: number;
      counsellingNeeded: number;
    }>;
  }>;
  studentsCount: number;
  lastRefreshedAt?: string;
  credentials?: Record<string, DepartmentCredential>;
}

export function processSheetCSV(csvText: string, month: string): DashboardPayload {
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    throw new Error('Spreadsheet returned empty or insufficient rows.');
  }

  // Row 0 is the Header row
  const headers = rows[0] || [];

  // Helper to dynamically find column indices by header text with exact match priority
  const getColIdx = (exactMatches: string[], partialKeywords: string[], fallback: number): number => {
    // 1. Exact match (case-insensitive, trimmed)
    for (let c = 0; c < headers.length; c++) {
      const h = (headers[c] || '').trim().toLowerCase();
      if (exactMatches.some(m => h === m.toLowerCase())) {
        return c;
      }
    }
    // 2. Substring with full phrase
    for (let c = 0; c < headers.length; c++) {
      const h = (headers[c] || '').trim().toLowerCase();
      if (exactMatches.some(m => h.includes(m.toLowerCase()))) {
        return c;
      }
    }
    // 3. Partial keywords
    for (let c = 0; c < headers.length; c++) {
      const h = (headers[c] || '').trim().toLowerCase();
      if (partialKeywords.some(k => h.includes(k.toLowerCase()))) {
        return c;
      }
    }
    return fallback;
  };

  // Exact mappings aligned with the user's updated sheet:
  // Col A (0): Tracker S.No
  // Col B (1): Division Name
  // Col C (2): Taluk Name
  // Col D (3): Block Name
  // Col E (4): School Name
  // Col F (5): Category
  // Col G (6): EMIS_ID
  // Col H (7): Student Name
  // Col I (8): Gender
  // Col J (9): Std
  // Col K (10): Sec
  // Col L (11): Address
  // Col M (12): Contact No
  // Col N (13): Repeater or Not
  // Col O (14): Line Department
  // Col P (15): Dropout Reason
  // Col Q (16): CounsellingRequired
  // Col R (17): Present Status
  // Col S (18): Remarks / Notes

  const sNoIdx = getColIdx(['s.no', 'sno', 'sl.no', 'tracker s.no', 'potential dropout tracker s.no'], ['tracker', 'serial', 's.no'], 0);
  const divisionIdx = getColIdx(['division name', 'division', 'revenue division'], ['division'], 1);
  const talukIdx = getColIdx(['taluk name', 'taluk', 'revenue taluk'], ['taluk'], 2);
  const blockIdx = getColIdx(['block name', 'educational block', 'block'], ['block'], 3);
  const schoolIdx = getColIdx(['school name', 'school'], ['school'], 4);
  const categoryIdx = getColIdx(['category', 'school category'], ['category'], 5);
  const emisIdx = getColIdx(['emis_id', 'emis id', 'emis number', 'emis'], ['emis'], 6);
  const nameIdx = getColIdx(['student name', 'name of the student', 'student_name'], ['student name', 'student'], 7);
  const genderIdx = getColIdx(['gender', 'sex'], ['gender'], 8);
  const stdIdx = getColIdx(['std', 'standard', 'class', 'grade'], ['std', 'standard'], 9);
  const secIdx = getColIdx(['sec', 'section'], ['section', 'sec'], 10);
  const addressIdx = getColIdx(['address', 'residential address'], ['address'], 11);
  const contactIdx = getColIdx(['contact no', 'contact number', 'phone', 'mobile'], ['contact', 'phone'], 12);
  const repeaterIdx = getColIdx(['repeater or not', 'repeater status', 'repeater'], ['repeater'], 13);
  const lineDeptIdx = getColIdx(['line department', 'line dept'], ['department', 'dept'], 14);
  const dropoutReasonIdx = getColIdx(['dropout reason', 'reason for dropout'], ['reason'], 15);
  const counsellingIdx = getColIdx(['counsellingrequired', 'counselling required', 'counselling needed', 'counselling'], ['counsel'], 16);
  const statusIdx = getColIdx(['present status', 'status', 'current status'], ['present status', 're-enrolled'], 17);
  const remarksIdx = getColIdx(['remarks / notes', 'remarks', 'notes', 'comments'], ['remarks', 'notes'], 18);

  const knownIndices = new Set([
    sNoIdx, divisionIdx, talukIdx, blockIdx, schoolIdx, categoryIdx, emisIdx,
    nameIdx, genderIdx, stdIdx, secIdx, addressIdx, contactIdx, repeaterIdx,
    lineDeptIdx, dropoutReasonIdx, counsellingIdx, statusIdx, remarksIdx
  ]);

  const students: StudentRecord[] = [];
  const blockCounts: Record<string, number> = {};
  const classCounts: Record<string, { total: number; boys: number; girls: number }> = {};
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

  let totalRepeaters = 0;
  let totalReadmitted = 0;
  let totalMigrated = 0;
  let totalCounsellingNeeded = 0;
  let totalStatusNotUpdated = 0;

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const sNo = r[sNoIdx] || '';
    const blockRaw = r[blockIdx] || '';
    const studentName = (r[nameIdx] || '').trim();

    // Valid student check (must have student name or block populated)
    if (!studentName && !blockRaw) continue;

    // Normalize block name
    let block = blockRaw.trim();
    if (block === 'Alwarthirunagar') block = 'Alwarthirunagari';
    if (!block) block = 'Unassigned';

    blockCounts[block] = (blockCounts[block] || 0) + 1;

    // Class / Standard
    const rawStd = (r[stdIdx] || '').trim();
    const stdNum = parseInt(rawStd, 10);
    const stdKey = stdNum ? `Class ${stdNum}` : rawStd ? `Class ${rawStd}` : 'Other';
    
    // Gender check for class-wise boys vs girls breakdown
    const genderRaw = (r[genderIdx] || '').trim().toLowerCase();
    const isGirl = genderRaw === 'female' || genderRaw === 'girl' || genderRaw === 'f';
    if (!classCounts[stdKey]) {
      classCounts[stdKey] = { total: 0, boys: 0, girls: 0 };
    }
    classCounts[stdKey].total++;
    if (isGirl) {
      classCounts[stdKey].girls++;
    } else {
      classCounts[stdKey].boys++;
    }

    // Repeater or Not (Col N / repeaterIdx)
    const repeaterVal = (r[repeaterIdx] || '').trim();
    const nLower = repeaterVal.toLowerCase();
    const isRepeater = nLower === 'repeater' || (nLower.includes('repeater') && !nLower.includes('not'));
    if (isRepeater) totalRepeaters++;

    // Present Status / Re-enrolled (Col R / statusIdx)
    const statusVal = (r[statusIdx] || '').trim();
    const rLower = statusVal.toLowerCase();
    const remarksVal = (r[remarksIdx] || '').toLowerCase();
    
    const isReEnrolled = rLower === 're-enrolled' ||
      rLower === 'reenrolled' ||
      rLower === 're-enroll' ||
      rLower === 'reenroll' ||
      rLower.includes('re-enroll') ||
      rLower.includes('reenroll') ||
      rLower.includes('readmitted') ||
      rLower.includes('readmit');

    if (isReEnrolled || remarksVal.includes('readmit') || remarksVal.includes('re-enroll')) {
      totalReadmitted++;
    }

    const isMigrated = rLower.includes('migrat') || remarksVal.includes('migrat');
    if (isMigrated) {
      totalMigrated++;
    }

    const isStatusNotUpdated = !statusVal || 
      rLower === 'not updated' || 
      rLower === 'status not updated' || 
      rLower === 'open' || 
      rLower.includes('pending') ||
      rLower === 'active verification';
    if (isStatusNotUpdated && !isReEnrolled && !isMigrated) {
      totalStatusNotUpdated++;
    }

    // Counselling Needed (Col Q / counsellingIdx)
    const counsellingVal = (r[counsellingIdx] || '').trim();
    const qLower = counsellingVal.toLowerCase();
    const isCounsellingNeeded = qLower === 'yes' || 
      qLower === 'required' || 
      qLower === 'true' || 
      qLower.includes('yes') || 
      qLower.includes('need') || 
      qLower.includes('counsel');
    if (isCounsellingNeeded) {
      totalCounsellingNeeded++;
    }

    // Line Department (Col O / lineDeptIdx)
    const lineDeptRaw = (r[lineDeptIdx] || '').trim();
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
        for (const deptKey of deptList) {
          const keyLower = deptKey.toLowerCase();
          const shortKey = keyLower.replace(' department', '');
          if (clean === keyLower || clean === shortKey || clean.includes(shortKey) || keyLower.includes(clean)) {
            assignedDept = deptKey;
            break;
          }
        }
      }
    }

    // Determine Division from Col B / divisionIdx or Block
    const divisionCol = (r[divisionIdx] || '').trim();
    let division = 'Thoothukudi';
    if (divisionCol) {
      const divLower = divisionCol.toLowerCase();
      if (divLower.includes('kovilpatti') || divLower.includes('1')) {
        division = 'Kovilpatti';
      } else if (divLower.includes('tiruchendur') || divLower.includes('thiruchen') || divLower.includes('3')) {
        division = 'Tiruchendur';
      } else if (divLower.includes('thoothukudi') || divLower.includes('tuticorin') || divLower.includes('thootukudi') || divLower.includes('2')) {
        division = 'Thoothukudi';
      } else {
        division = divisionCol;
      }
    } else {
      if (DIVISION_BLOCKS['Kovilpatti']?.includes(block)) {
        division = 'Kovilpatti';
      } else if (DIVISION_BLOCKS['Tiruchendur']?.includes(block)) {
        division = 'Tiruchendur';
      } else {
        division = 'Thoothukudi';
      }
    }

    // Determine Taluk from Col C / talukIdx or fallback via block mapping
    const rawTaluk = (r[talukIdx] || '').trim();
    const taluk = rawTaluk || BLOCK_TO_TALUK_MAP[block] || (division + ' Taluk');

    // Collect any extra custom columns that user might add in reference sheet
    const customFields: Record<string, string> = {};
    for (let c = 0; c < r.length; c++) {
      if (!knownIndices.has(c) && headers[c] && (headers[c].trim().length > 0)) {
        const headerName = headers[c].trim();
        customFields[headerName] = (r[c] || '').trim();
      }
    }

    students.push({
      sNo: parseInt(sNo, 10) || students.length + 1,
      division,
      taluk,
      block,
      school: r[schoolIdx] || 'Government School',
      category: r[categoryIdx] || 'School',
      emisId: r[emisIdx] || '',
      studentName,
      gender: r[genderIdx] || '-',
      std: rawStd || '-',
      sec: r[secIdx] || '-',
      address: r[addressIdx] || '-',
      contactNo: r[contactIdx] || '-',
      repeaterStatus: repeaterVal || 'Not updated',
      isRepeater,
      lineDept: assignedDept,
      dropoutReason: r[dropoutReasonIdx] || '-',
      counsellingRequired: counsellingVal || 'No',
      isCounsellingNeeded,
      status: statusVal || 'Status Not Updated',
      isReEnrolled,
      isMigrated,
      isStatusNotUpdated,
      remarks: r[remarksIdx] || '',
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  // Convert block counts to sorted array for bar chart
  const blockData = Object.entries(blockCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Line Department counts
  const deptCounts: Record<string, number> = {};
  deptList.forEach(d => { deptCounts[d] = 0; });
  students.forEach(s => {
    if (deptCounts[s.lineDept] !== undefined) {
      deptCounts[s.lineDept]++;
    }
  });

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

  // Convert class counts to array for bar chart (ordered Std 1 to 12) with Boys and Girls differentiation
  const classData = Object.entries(classCounts)
    .map(([name, item]) => ({
      name,
      value: item.total,
      count: item.total,
      total: item.total,
      boys: item.boys,
      girls: item.girls,
      sortOrder: parseInt(name.replace('Class ', ''), 10) || 99,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Division breakdowns with Repeaters (Col N) and Re-Enrolled (Col R)
  const divisionSummary = ['Kovilpatti', 'Thoothukudi', 'Tiruchendur'].map((divName) => {
    const blocks = DIVISION_BLOCKS[divName] || [];
    const divStudents = students.filter(s => s.division === divName || blocks.includes(s.block));
    const divRepeaters = divStudents.filter(s => s.isRepeater).length;
    const divReEnrolled = divStudents.filter(s => s.isReEnrolled).length;
    const divCounselling = divStudents.filter(s => s.isCounsellingNeeded).length;
    const blockList = blocks.map(b => {
      const bStudents = divStudents.filter(s => s.block === b);
      return {
        name: b,
        count: blockCounts[b] || 0,
        repeaters: bStudents.filter(s => s.isRepeater).length,
        reEnrolled: bStudents.filter(s => s.isReEnrolled).length,
        counsellingNeeded: bStudents.filter(s => s.isCounsellingNeeded).length,
      };
    });
    return {
      name: divName,
      totalStudents: divStudents.length,
      repeaters: divRepeaters,
      reEnrolled: divReEnrolled,
      counsellingNeeded: divCounselling,
      blocks: blockList,
    };
  });

  // Build All Line Departments Abstract
  const allLineDepartmentsAbstract: DepartmentAbstract[] = deptList.map(deptName => {
    const deptStudents = students.filter(s => s.lineDept === deptName);
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

  // Department detail objects
  const departments = allLineDepartmentsAbstract.map(abs => ({
    id: abs.id,
    name: abs.name,
    guideline: DEPT_GUIDELINES[abs.name] || '',
    count: abs.potentialDropout,
    potentialDropout: abs.potentialDropout,
    repeaters: abs.repeaters,
    reEnrolled: abs.reEnrolled,
    counsellingNeeded: abs.counsellingNeeded,
    statusNotUpdated: abs.statusNotUpdated,
    migrated: abs.migrated,
    students: abs.students,
  }));

  // Taluk-wise summary for Revenue Department
  const talukMap: Record<string, StudentRecord[]> = {};
  students.forEach(s => {
    const t = s.taluk || 'Unassigned Taluk';
    if (!talukMap[t]) talukMap[t] = [];
    talukMap[t].push(s);
  });

  const talukSummaries: TalukSummary[] = Object.entries(talukMap)
    .map(([talukName, tStudents]) => ({
      name: talukName,
      potentialDropout: tStudents.length,
      repeaters: tStudents.filter(s => s.isRepeater).length,
      reEnrolled: tStudents.filter(s => s.isReEnrolled).length,
      counsellingNeeded: tStudents.filter(s => s.isCounsellingNeeded).length,
      statusNotUpdated: tStudents.filter(s => s.isStatusNotUpdated).length,
      migrated: tStudents.filter(s => s.isMigrated).length,
      students: tStudents,
    }))
    .sort((a, b) => b.potentialDropout - a.potentialDropout);

  return {
    selectedMonth: month,
    availableMonths: AVAILABLE_MONTHS,
    summary: {
      potentialDropout: students.length,
      readmitted: totalReadmitted,
      migrated: totalMigrated,
      repeaters: totalRepeaters,
      reEnrolled: totalReadmitted,
      counsellingNeeded: totalCounsellingNeeded,
      statusNotUpdated: totalStatusNotUpdated,
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
    departments,
    allLineDepartmentsAbstract,
    talukSummaries,
    divisions: divisionSummary,
    availableHeaders: headers.map(h => (h || '').trim()).filter(Boolean),
    studentsCount: students.length,
    lastRefreshedAt: new Date().toISOString(),
  };
}
