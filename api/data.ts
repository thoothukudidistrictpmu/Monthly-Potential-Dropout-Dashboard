import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SPREADSHEET_ID, MONTH_TABS, processSheetCSV, fetchLiveCredentials, DEFAULT_DEPARTMENT_CREDENTIALS } from '../src/sheetData.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
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
  const normalizedMonth = month === 'Sep 26' ? 'Sep 2026' : month === 'Oct 26' ? 'Oct 2026' : month === 'Nov 26' ? 'Nov 2026' : month;
  const targetGid = MONTH_TABS[normalizedMonth] || MONTH_TABS[month] || MONTH_TABS['Sep 2026'];

  try {
    const sheetRes = await fetch(
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${targetGid}`,
      { headers: { 'User-Agent': 'Thoothukudi-Dropout-Dashboard/2.0' } }
    );

    if (!sheetRes.ok) {
      throw new Error(`Google Sheet returned HTTP ${sheetRes.status} for "${normalizedMonth}"`);
    }

    const [csvText, creds] = await Promise.all([
      sheetRes.text(),
      fetchLiveCredentials().catch(() => DEFAULT_DEPARTMENT_CREDENTIALS)
    ]);
    const payload = processSheetCSV(csvText, normalizedMonth);
    payload.credentials = creds;

    // Cache on Vercel Edge for 60 seconds, stale while revalidate 300 seconds
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ data: payload, cached: false, timestamp: Date.now() });
  } catch (error: any) {
    console.error('Vercel API error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
