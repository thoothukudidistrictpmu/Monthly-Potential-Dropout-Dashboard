import React, { useState } from 'react';
import {
  X,
  Check,
  Copy,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { APPS_SCRIPT_CODE, APPS_SCRIPT_SPREADSHEET_ID } from '../appsScriptTemplate';

interface SheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onSaveWebhookUrl: (url: string) => void;
  hasEnvUrl: boolean;
  selectedMonth: string;
  pendingLocalCount: number;
  onSyncAllLocalEdits: () => Promise<{ updated: number; error?: string }>;
}

export function SheetSyncModal({
  isOpen,
  onClose,
  webhookUrl,
  onSaveWebhookUrl,
  hasEnvUrl,
  selectedMonth,
  pendingLocalCount,
  onSyncAllLocalEdits,
}: SheetSyncModalProps) {
  const [urlInput, setUrlInput] = useState(webhookUrl);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    details?: string;
  } | null>(null);

  if (!isOpen) return null;

  const activeUrl = urlInput.trim();

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback selection copy
      const el = document.createElement('textarea');
      el.value = APPS_SCRIPT_CODE;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSave = () => {
    onSaveWebhookUrl(activeUrl);
    setTestResult({
      ok: true,
      message: activeUrl
        ? 'Apps Script Web App URL saved. All dashboard edits will sync automatically.'
        : 'Custom URL cleared.',
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const targetUrl = activeUrl || webhookUrl;
      if (targetUrl) {
        onSaveWebhookUrl(targetUrl);
      }
      const query = targetUrl ? `?webhookUrl=${encodeURIComponent(targetUrl)}` : '';
      const res = await fetch(`/api/sheet-sync${query}`);
      const json = await res.json();

      if (json.ok) {
        const sheetNames = Array.isArray(json.sheets)
          ? json.sheets.map((s: any) => `${s.name} (${s.rows} rows)`).join(', ')
          : '';
        setTestResult({
          ok: true,
          message: `Connected to "${json.spreadsheetName || 'Google Sheet'}"`,
          details: sheetNames ? `Tabs detected: ${sheetNames}` : undefined,
        });
      } else if (json.configured === false && !targetUrl) {
        setTestResult({
          ok: false,
          message: 'Please paste your deployed Google Apps Script Web App URL (/exec) first.',
        });
      } else {
        setTestResult({
          ok: false,
          message: json.error || 'Could not verify Apps Script connection.',
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || 'Network error while testing connection.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handlePushAll = async () => {
    setSyncingAll(true);
    setTestResult(null);
    try {
      const res = await onSyncAllLocalEdits();
      if (res.error) {
        setTestResult({ ok: false, message: res.error });
      } else {
        setTestResult({
          ok: true,
          message: `Successfully pushed ${res.updated} student record(s) to Google Sheet (${selectedMonth}).`,
        });
      }
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#1e3a5f] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b-2 border-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <CloudUpload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Google Sheet Live Sync Setup (Apps Script)
              </h2>
              <p className="text-xs text-slate-200 font-medium">
                Spreadsheet ID:{' '}
                <span className="font-mono font-bold text-white">{APPS_SCRIPT_SPREADSHEET_ID}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Web App URL Configuration Box */}
          <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="apps-script-url-input" className="text-sm font-black text-slate-900">
                1. Apps Script Web App URL (<code className="text-xs font-mono bg-slate-200 px-1.5 py-0.5 rounded">/exec</code>)
              </label>
              <a
                href={`https://docs.google.com/spreadsheets/d/${APPS_SCRIPT_SPREADSHEET_ID}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a5f] hover:underline"
              >
                <span>Open Target Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {hasEnvUrl && !webhookUrl && (
              <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Server environment variable GOOGLE_APPS_SCRIPT_URL is active.</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="apps-script-url-input"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 text-xs sm:text-sm font-mono px-3.5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#1e3a5f] hover:bg-[#162c48] text-white shadow-xs cursor-pointer transition-colors"
                >
                  Save URL
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Testing...' : 'Test Connection'}</span>
                </button>
                {webhookUrl && (
                  <button
                    onClick={() => {
                      setUrlInput('');
                      onSaveWebhookUrl('');
                      setTestResult(null);
                    }}
                    className="px-3 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 cursor-pointer"
                    title="Clear saved URL"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {(webhookUrl || hasEnvUrl) && pendingLocalCount > 0 && (
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-300">
                <span className="text-xs font-bold text-slate-700">
                  {pendingLocalCount} student record(s) have edits saved locally for <strong>{selectedMonth}</strong>.
                </span>
                <button
                  onClick={handlePushAll}
                  disabled={syncingAll}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white shadow-2xs cursor-pointer disabled:opacity-60"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>{syncingAll ? 'Pushing...' : `Sync All ${selectedMonth} Edits to Sheet`}</span>
                </button>
              </div>
            )}

            {testResult && (
              <div
                className={`rounded-xl px-4 py-3 text-xs sm:text-sm font-bold border flex items-start gap-2.5 ${
                  testResult.ok
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                )}
                <div>
                  <div>{testResult.message}</div>
                  {testResult.details && (
                    <div className="text-xs font-medium mt-1 text-emerald-800">{testResult.details}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Setup Instructions */}
          <div className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-4 sm:p-5 space-y-2.5">
            <h3 className="text-sm font-black text-amber-950 uppercase tracking-wider">
              2. How to Deploy the Apps Script in Your Google Sheet
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm font-medium text-slate-800">
              <li>
                Open your Google Sheet (ID: <code className="font-mono font-bold">1QaxFBlOUpkGU2ZraBCcUooFmgXVV4vVuN4WdionZUKk</code>).
              </li>
              <li>
                In the top menu, click <strong>Extensions &rarr; Apps Script</strong>.
              </li>
              <li>
                Delete any placeholder code inside <code className="font-mono bg-amber-100 px-1 rounded">Code.gs</code>, copy the script below, paste it, and click <strong>Save</strong>.
              </li>
              <li>
                Click <strong>Deploy &rarr; New deployment</strong> &rarr; click the gear icon &rarr; choose <strong>Web app</strong>.
              </li>
              <li>
                Set <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong>, then click <strong>Deploy</strong> and authorize access.
              </li>
              <li>
                Copy the generated <strong>Web app URL</strong> (ends with <code className="font-mono bg-amber-100 px-1 rounded">/exec</code>) and paste it above (or set <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_APPS_SCRIPT_URL</code> in Vercel Environment Variables so all department officials share it automatically).
              </li>
            </ol>
          </div>

          {/* Copyable Apps Script Code */}
          <div className="border-2 border-slate-300 rounded-2xl overflow-hidden bg-slate-900">
            <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2 text-xs font-black text-slate-200 uppercase tracking-wider">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>Code.gs — Google Apps Script (Columns Q to Y Live Write-Back)</span>
              </div>
              <button
                onClick={handleCopyScript}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-4 text-[11px] sm:text-xs font-mono text-slate-100 overflow-x-auto max-h-72 leading-relaxed">
              {APPS_SCRIPT_CODE}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
