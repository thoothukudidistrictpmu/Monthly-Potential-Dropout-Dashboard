import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SPREADSHEET_ID, MONTH_TABS, processSheetCSV } from '../src/sheetData.js';

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

  const month = (req.query.month as string) || 'Sep 26';
  const targetGid = MONTH_TABS[month] || MONTH_TABS['Sep 26'];

  try {
    const sheetRes = await fetch(
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${targetGid}`,
      { headers: { 'User-Agent': 'Thoothukudi-Dropout-Dashboard/2.0' } }
    );

    if (!sheetRes.ok) {
      throw new Error(`Google Sheet returned HTTP ${sheetRes.status} for "${month}"`);
    }

    const csvText = await sheetRes.text();
    const payload = processSheetCSV(csvText, month);

    // Cache on Vercel Edge for 60 seconds, stale while revalidate 300 seconds
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ data: payload, cached: false, timestamp: Date.now() });
  } catch (error: any) {
    console.error('Vercel API error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
