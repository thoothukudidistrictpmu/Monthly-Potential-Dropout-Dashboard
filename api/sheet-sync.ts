import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const webhookUrl =
    (req.method === 'GET'
      ? (req.query.webhookUrl as string)
      : (req.body?.webhookUrl as string)) ||
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    process.env.VITE_APPS_SCRIPT_URL ||
    '';

  const envUrlExists = Boolean(process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL);

  if (req.method === 'GET') {
    if (!webhookUrl) {
      return res.status(200).json({
        configured: false,
        hasEnvUrl: envUrlExists,
      });
    }

    try {
      const testRes = await fetch(webhookUrl, { method: 'GET', redirect: 'follow' });
      const text = await testRes.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        return res.status(502).json({
          ok: false,
          hasEnvUrl: envUrlExists,
          error: 'Apps Script did not return valid JSON. Make sure "Who has access" is set to "Anyone" and you deployed a Web App URL.',
          rawPreview: text.slice(0, 200),
        });
      }
      return res.status(200).json({ configured: true, hasEnvUrl: envUrlExists, ...parsed });
    } catch (err: any) {
      return res.status(502).json({ ok: false, hasEnvUrl: envUrlExists, error: err?.message || 'Failed to reach Apps Script URL' });
    }
  }

  if (req.method === 'POST') {
    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        configured: false,
        error: 'Apps Script Web App URL is not configured.',
      });
    }

    try {
      const { webhookUrl: _ignored, ...payload } = req.body || {};
      const scriptRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const text = await scriptRes.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        return res.status(502).json({
          success: false,
          error: 'Apps Script returned a non-JSON response. Verify deployment access is "Anyone".',
          rawPreview: text.slice(0, 200),
        });
      }

      return res.status(200).json(parsed);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Error forwarding update to Google Apps Script',
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
