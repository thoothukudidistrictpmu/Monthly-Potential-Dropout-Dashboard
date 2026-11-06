import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { SPREADSHEET_ID, MONTH_TABS, processSheetCSV, fetchLiveCredentials, fetchLiveMonthTabs, DEFAULT_DEPARTMENT_CREDENTIALS } from './src/sheetData.js';

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

let cachedMonthTabs: Record<string, string> = { ...MONTH_TABS };
let cachedAvailableMonths: string[] = ['Sep 2026', 'Oct 2026'];
let monthTabsTimestamp = 0;

async function getOrFetchMonthTabs() {
  if (Date.now() - monthTabsTimestamp < CACHE_TTL_MS) {
    return { tabs: cachedMonthTabs, availableMonths: cachedAvailableMonths };
  }
  try {
    const live = await fetchLiveMonthTabs();
    cachedMonthTabs = { ...MONTH_TABS, ...live.tabs };
    cachedAvailableMonths = live.availableMonths;
    monthTabsTimestamp = Date.now();
    return { tabs: cachedMonthTabs, availableMonths: cachedAvailableMonths };
  } catch {
    return { tabs: cachedMonthTabs, availableMonths: cachedAvailableMonths };
  }
}

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
  // Normalize month name
  let normalizedMonth = month;
  if (/sep/i.test(month)) normalizedMonth = 'Sep 2026';
  else if (/oct/i.test(month)) normalizedMonth = 'Oct 2026';
  else if (/nov/i.test(month)) normalizedMonth = 'Nov 2026';

  const cacheKey = normalizedMonth;

  if (forceRefresh) {
    delete cacheStore[cacheKey];
    monthTabsTimestamp = 0;
    credentialsTimestamp = 0;
  }

  if (!forceRefresh && cacheStore[cacheKey] && Date.now() - cacheStore[cacheKey].timestamp < CACHE_TTL_MS) {
    return { data: cacheStore[cacheKey].data, cached: true, timestamp: cacheStore[cacheKey].timestamp };
  }

  const { tabs, availableMonths } = await getOrFetchMonthTabs();
  const targetGid = tabs[normalizedMonth] || tabs[month] || MONTH_TABS[normalizedMonth];

  if (!targetGid) {
    // Tab doesn't exist in sheet yet, return empty payload for that month
    const creds = await getOrFetchCredentials();
    const emptyPayload = processSheetCSV('"S.No","Division Name","Taluk Name","Block Name","School Name","Student Name","Category","EMIS_ID","Gender","Std","Sec","Absent Days","Address ","Contact No","Repeater or Not","Line Department","Dropout Reason","Request to Transfer Department","Counselling Required","Counselling By","Counsellor Name","Counselling given date","Present Status","Department / Counsellors Remarks"\n', normalizedMonth);
    emptyPayload.availableMonths = availableMonths;
    emptyPayload.credentials = creds;

    cacheStore[cacheKey] = {
      data: emptyPayload,
      timestamp: Date.now(),
    };
    return { data: emptyPayload, cached: false, timestamp: Date.now() };
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
    payload.availableMonths = availableMonths;
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
  const httpServer = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
