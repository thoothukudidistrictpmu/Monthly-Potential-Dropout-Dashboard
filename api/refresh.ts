import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  SPREADSHEET_ID, 
  MONTH_TABS, 
  AVAILABLE_MONTHS,
  processSheetCSV, 
  fetchLiveCredentials, 
  DEFAULT_DEPARTMENT_CREDENTIALS,
  fetchLiveMonthTabs 
} from '../src/sheetData.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const month = (req.query.month as string) || 'Sep 2026';
  let normalizedMonth = month;
  if (/sep/i.test(month)) normalizedMonth = 'Sep 2026';
  else if (/oct/i.test(month)) normalizedMonth = 'Oct 2026';
  else if (/nov/i.test(month)) normalizedMonth = 'Nov 2026';
  else if (/dec/i.test(month)) normalizedMonth = 'Dec 2026';

  try {
    const [{ tabs, availableMonths }, creds] = await Promise.all([
      fetchLiveMonthTabs().catch(() => ({ tabs: MONTH_TABS, availableMonths: AVAILABLE_MONTHS })),
      fetchLiveCredentials().catch(() => DEFAULT_DEPARTMENT_CREDENTIALS)
    ]);

    const targetGid = tabs[normalizedMonth] || tabs[month] || MONTH_TABS[normalizedMonth] || '419562693';

    const sheetRes = await fetch(
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${targetGid}`,
      { 
        headers: { 'User-Agent': 'Thoothukudi-Dropout-Dashboard/2.0' },
        cache: 'no-store'
      }
    );

    if (!sheetRes.ok) {
      throw new Error(`Google Sheet returned HTTP ${sheetRes.status} for "${normalizedMonth}" (gid: ${targetGid})`);
    }

    const csvText = await sheetRes.text();
    const payload = processSheetCSV(csvText, normalizedMonth);
    payload.availableMonths = availableMonths;
    payload.credentials = creds;

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).json({ data: payload, cached: false, timestamp: Date.now() });
  } catch (error: any) {
    console.error('Vercel API error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
