import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchLiveCredentials, DEFAULT_DEPARTMENT_CREDENTIALS } from '../src/sheetData.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const creds = await fetchLiveCredentials();
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ credentials: creds });
  } catch (err: any) {
    return res.status(200).json({ credentials: DEFAULT_DEPARTMENT_CREDENTIALS });
  }
}
