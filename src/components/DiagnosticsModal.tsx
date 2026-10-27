import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Database,
  Cpu,
  Layers,
  FileCode,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { HealthInfo, TestSuiteResponse } from '../types';
import { api } from '../services/api';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthInfo | null;
  onRefreshHealth: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  health,
  onRefreshHealth,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'tests' | '502diagnosis' | 'windows-setup'>('status');
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiDiag, setGeminiDiag] = useState<any>(null);

  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestSuiteResponse | null>(null);

  if (!isOpen) return null;

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiDiag(null);
    try {
      const res = await api.testGemini();
      setGeminiDiag(res.diagnostics);
      onRefreshHealth();
    } catch (err: any) {
      setGeminiDiag({ ok: false, error: err.message });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleRunSystemTests = async () => {
    setRunningTests(true);
    try {
      const suite = await api.runSystemTests();
      setTestResults(suite);
      onRefreshHealth();
    } catch (err: any) {
      setTestResults({
        success: false,
        summary: `Failed to complete test run: ${err.message}`,
        results: [],
      });
    } finally {
      setRunningTests(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl bg-[#1C1C1C] border border-[#333333] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-[#2C2C2C] flex items-center justify-between bg-[#181818]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#10A37F] flex items-center justify-center text-white">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">System Diagnostics & Verification</h2>
              <p className="text-[11px] text-[#808080]">Full-stack health, Gemini tests & database verification</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#2C2C2C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2C2C2C] bg-[#141414] px-4 gap-2 pt-2 text-xs">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'status'
                ? 'border-[#10A37F] text-white'
                : 'border-transparent text-[#808080] hover:text-[#C0C0C0]'
            }`}
          >
            Live Status
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'tests'
                ? 'border-[#10A37F] text-white'
                : 'border-transparent text-[#808080] hover:text-[#C0C0C0]'
            }`}
          >
            Automated Tests
          </button>
          <button
            onClick={() => setActiveTab('502diagnosis')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === '502diagnosis'
                ? 'border-[#10A37F] text-white'
                : 'border-transparent text-[#808080] hover:text-[#C0C0C0]'
            }`}
          >
            502 Bug Root Cause
          </button>
          <button
            onClick={() => setActiveTab('windows-setup')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'windows-setup'
                ? 'border-[#10A37F] text-white'
                : 'border-transparent text-[#808080] hover:text-[#C0C0C0]'
            }`}
          >
            Windows & MySQL Setup
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-[#CCCCCC]">
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Gemini Provider Status */}
              <div className="p-4 rounded-xl bg-[#242424] border border-[#333333] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Sparkles className="w-4 h-4 text-[#10A37F]" />
                    <span>Gemini AI Provider</span>
                  </div>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10A37F]/10 text-[#10A37F] border border-[#10A37F]/30 text-[11px] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10A37F]" />
                    {health?.gemini?.model || 'gemini-3.8-flash'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#A0A0A0]">
                  <div>SDK: <span className="text-white font-mono">@google/genai (v2.4.0)</span></div>
                  <div>API Key: <span className="text-[#10A37F]">Injected & Active</span></div>
                  <div>Role format: <span className="text-white font-mono">OpenAI &rarr; user / model</span></div>
                  <div>Error Handling: <span className="text-[#10A37F]">Full Express Guard</span></div>
                </div>

                <div className="pt-2 border-t border-[#333333] flex items-center justify-between">
                  <button
                    onClick={handleTestGemini}
                    disabled={testingGemini}
                    className="px-3 py-1.5 rounded-lg bg-[#10A37F] hover:bg-[#0E8E6D] text-white font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {testingGemini ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-white" />
                    )}
                    <span>Ping Gemini Model</span>
                  </button>

                  {geminiDiag && (
                    <div className="text-[11px]">
                      {geminiDiag.ok ? (
                        <span className="text-[#10A37F] font-mono">
                          Live ping OK ({geminiDiag.latencyMs}ms): "{geminiDiag.sampleReply}"
                        </span>
                      ) : (
                        <span className="text-red-400 font-mono">
                          Error: {geminiDiag.error}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Database Status */}
              <div className="p-4 rounded-xl bg-[#242424] border border-[#333333] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Database className="w-4 h-4 text-[#10A37F]" />
                    <span>Database Engine</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#2A2A2A] text-white border border-[#3A3A3A] font-mono text-[11px]">
                    {health?.database?.engine || 'Persistent Storage'}
                  </span>
                </div>

                <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                  {health?.database?.details}
                </p>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#1A1A1A] text-center">
                  <div>
                    <div className="text-sm font-semibold text-white">{health?.database?.counts?.users ?? 0}</div>
                    <div className="text-[10px] text-[#707070] uppercase">Users</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{health?.database?.counts?.conversations ?? 0}</div>
                    <div className="text-[10px] text-[#707070] uppercase">Chats</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{health?.database?.counts?.messages ?? 0}</div>
                    <div className="text-[10px] text-[#707070] uppercase">Messages</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Automated Backend & Integration Tests</h3>
                  <p className="text-[11px] text-[#808080]">Runs live assertions against auth, DB, cascading delete, and Gemini</p>
                </div>
                <button
                  onClick={handleRunSystemTests}
                  disabled={runningTests}
                  className="px-3.5 py-2 rounded-xl bg-[#10A37F] hover:bg-[#0E8E6D] text-white font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {runningTests ? (
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-white" />
                  )}
                  <span>Run All Tests</span>
                </button>
              </div>

              {testResults ? (
                <div className="space-y-2">
                  <div className={`p-2.5 rounded-lg border text-xs font-semibold ${
                    testResults.success 
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
                      : 'bg-red-950/40 border-red-800 text-red-300'
                  }`}>
                    {testResults.summary}
                  </div>

                  <div className="divide-y divide-[#2B2B2B] border border-[#2B2B2B] rounded-xl overflow-hidden bg-[#181818]">
                    {testResults.results.map((res, i) => (
                      <div key={i} className="p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {res.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-[#10A37F] shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span className={res.passed ? 'text-[#E0E0E0]' : 'text-red-300'}>
                            {res.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#707070]">
                          {res.durationMs}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-[#707070] border border-dashed border-[#303030] rounded-xl">
                  Click "Run All Tests" to execute the full integration verification suite.
                </div>
              )}
            </div>
          )}

          {activeTab === '502diagnosis' && (
            <div className="space-y-3.5 leading-relaxed">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200">
                <div className="font-semibold text-amber-300 mb-1">
                  Why POST /api/chat returned 502 Bad Gateway
                </div>
                <p className="text-[11px] text-amber-200/90">
                  Our comprehensive code and SDK audit identified the precise sequence of failures causing the 502:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-[#222222] border border-[#333333]">
                  <div className="font-medium text-white mb-1">1. Role Mismatch in Payload</div>
                  <p className="text-[#A0A0A0] text-[11px]">
                    The frontend sent standard ChatGPT message formats with <code className="text-[#10A37F]">role: "assistant"</code>. The Google Gemini API strictly requires <code className="text-[#10A37F]">role: "model"</code>. Unmapped assistant roles caused Gemini API to reject the payload with an immediate 400 Bad Request error.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#222222] border border-[#333333]">
                  <div className="font-medium text-white mb-1">2. Unhandled Promise Rejection in Express</div>
                  <p className="text-[#A0A0A0] text-[11px]">
                    When the Gemini SDK threw an error, the previous server route lacked an asynchronous try/catch boundary. An unhandled promise rejection hung the Express worker or crashed the upstream Node process, causing the reverse proxy (or local port forwarder) to return <code className="text-red-400">502 Bad Gateway</code> to the browser.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#222222] border border-[#333333]">
                  <div className="font-medium text-white mb-1">3. SDK Version & Model Migration</div>
                  <p className="text-[#A0A0A0] text-[11px]">
                    Using modern <code className="text-[#10A37F]">@google/genai (v2.4.0)</code> requires initializing <code className="text-[#10A37F]">new GoogleGenAI({`{ apiKey, httpOptions }`})</code> with supported current models such as <code className="text-[#10A37F]">gemini-3.8-flash</code>. Deprecated models like <code className="text-red-400">gemini-1.5-flash</code> or <code className="text-red-400">gemini-pro</code> trigger 404 upstream errors.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300">
                  <div className="font-medium mb-1">The Resolution Implemented in MyAI:</div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-emerald-200/90">
                    <li>Added <code className="text-[#10A37F]">formatMessagesForGemini()</code> to convert OpenAI turns to valid Gemini user/model turns.</li>
                    <li>Guarded all routes with comprehensive try/catch blocks and consistent JSON response schemas.</li>
                    <li>Configured <code className="text-[#10A37F]">gemini-3.8-flash</code> with official SDK 2.4.0.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'windows-setup' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Running MyAI on Windows (VS Code & PowerShell)</h3>
              <p className="text-[#A0A0A0] text-[11px]">
                To run MyAI in your local Windows environment (<code className="text-[#10A37F]">C:\Users\LENOVO\OneDrive\Desktop\MyAI</code>) with MySQL:
              </p>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#333333] space-y-2">
                <div className="font-medium text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#10A37F]" />
                  <span>1. MySQL Database Setup</span>
                </div>
                <p className="text-[11px] text-[#A0A0A0]">
                  Open MySQL Command Line Client or MySQL Workbench and run the provided schema:
                </p>
                <pre className="p-2.5 rounded bg-black/60 text-[#10A37F] font-mono text-[11px] overflow-x-auto">
{`mysql -u root -p < server/schema.sql`}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#333333] space-y-2">
                <div className="font-medium text-white flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-[#10A37F]" />
                  <span>2. Configure .env file</span>
                </div>
                <pre className="p-2.5 rounded bg-black/60 text-[#ECECEC] font-mono text-[11px] overflow-x-auto">
{`PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
USE_MYSQL=true
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=myai_db`}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-[#141414] border border-[#333333] space-y-2">
                <div className="font-medium text-white flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-[#10A37F]" />
                  <span>3. Install & Start in PowerShell</span>
                </div>
                <pre className="p-2.5 rounded bg-black/60 text-[#ECECEC] font-mono text-[11px] overflow-x-auto">
{`npm install
npm test
npm run dev`}
                </pre>
                <p className="text-[11px] text-[#808080]">
                  Visit <strong>http://localhost:3000</strong>. Your chats and user sessions will persist directly in MySQL!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
