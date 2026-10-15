import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { SPREADSHEET_ID, MONTH_TABS, processSheetCSV, fetchLiveCredentials, DEFAULT_DEPARTMENT_CREDENTIALS } from './src/sheetData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

interface CacheEntry {
  data: any;
  timestamp: number;
}
const cacheStore: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache

let cachedCredentials: any = null;
let credentialsTimestamp = 0;

async function getOrFetchCredentials() {
  if (cachedCredentials && Date.now() - credentialsTimestamp < CACHE_TTL_MS) {
    return cachedCredentials;
  }
  try {
    const creds = await fetchLiveCredentials();
    cachedCredentials = creds;
    credentialsTimestamp = Date.now();
    return creds;
  } catch (err) {
    return cachedCredentials || DEFAULT_DEPARTMENT_CREDENTIALS;
  }
}

async function fetchSpreadsheetData(month = 'Sep 2026', forceRefresh = false) {
  // Normalize month name to sheet tab name
  const normalizedMonth = month === 'Sep 26' ? 'Sep 2026' : month === 'Oct 26' ? 'Oct 2026' : month === 'Nov 26' ? 'Nov 2026' : month;
  const targetGid = MONTH_TABS[normalizedMonth] || MONTH_TABS[month] || MONTH_TABS['Sep 2026'];
  const cacheKey = normalizedMonth;

  if (!forceRefresh && cacheStore[cacheKey] && Date.now() - cacheStore[cacheKey].timestamp < CACHE_TTL_MS) {
    return { data: cacheStore[cacheKey].data, cached: true, timestamp: cacheStore[cacheKey].timestamp };
  }

  try {
    const [sheetRes, creds] = await Promise.all([
      fetch(
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${targetGid}`,
        { headers: { 'User-Agent': 'Thoothukudi-Dropout-Dashboard/2.0' } }
      ),
      getOrFetchCredentials(),
    ]);

    if (!sheetRes.ok) {
      throw new Error(`Failed to fetch Google Sheet data for sheet "${normalizedMonth}" (Status ${sheetRes.status})`);
    }

    const csvText = await sheetRes.text();
    const payload = processSheetCSV(csvText, normalizedMonth);
    payload.credentials = creds;

    cacheStore[cacheKey] = {
      data: payload,
      timestamp: Date.now(),
    };

    return { data: payload, cached: false, timestamp: cacheStore[cacheKey].timestamp };
  } catch (err: any) {
    console.error('Error in fetchSpreadsheetData:', err);
    throw err;
  }
}

app.get('/api/data', async (req, res) => {
  try {
    const month = (req.query.month as string) || 'Sep 2026';
    const result = await fetchSpreadsheetData(month, false);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/refresh', async (req, res) => {
  try {
    const month = (req.query.month as string) || 'Sep 2026';
    const result = await fetchSpreadsheetData(month, true);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/credentials', async (_req, res) => {
  try {
    const creds = await getOrFetchCredentials();
    res.json({ credentials: creds });
  } catch (e: any) {
    res.json({ credentials: DEFAULT_DEPARTMENT_CREDENTIALS });
  }
});


async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
