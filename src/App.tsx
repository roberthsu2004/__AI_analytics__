/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  FileText, 
  Trash2, 
  Download, 
  BookOpen, 
  AlertCircle, 
  Languages, 
  Clock, 
  PlusCircle, 
  HelpCircle,
  Cpu,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { SAMPLE_TRANSCRIPTS } from "./data";
import { MeetingRecord } from "./types";
import MarkdownRenderer from "./components/MarkdownRenderer";
import HistorySidebar from "./components/HistorySidebar";

// 語言選項定義
const TARGET_LANGUAGES = [
  { value: "繁體中文 ", label: "繁體中文 (高層精炼簡報)" },
  { value: "英文 English", label: "英文 English" },
  { value: "日文 日本語", label: "日文 日本語" },
  { value: "韓文 한국어", label: "韓文 한국어" },
  { value: "西班牙文 Español", label: "西班牙文 Español" },
  { value: "德文 Deutsch", label: "德文 Deutsch" },
];

// 摘要風格選項定義
const SUMMARY_STYLES = [
  { value: "詳細會議記錄", label: "詳細會議記錄 (結構完整、適合歸檔)" },
  { value: "精簡要點摘要", label: "精簡要點摘要 (核心痛點、直接了當)" },
  { value: "條列行動指南", label: "行動指南清單 (以 Action Items 導向)" },
  { value: "腦力激盪創意彙整", label: "腦力激盪整理 (發散觀點、部門碰撞)" },
];

export default function App() {
  // 輸入欄位狀態
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("英文 English");
  const [selectedStyle, setSelectedStyle] = useState("詳細會議記錄");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // 系統狀態
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState("");
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  
  // 複製與儲存狀態反饋
  const [copied, setCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // 歷程紀錄列表狀態
  const [records, setRecords] = useState<MeetingRecord[]>([]);

  // 1. 初始化讀取
  useEffect(() => {
    const saved = localStorage.getItem("ai_meeting_notes_records");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecords(parsed);
        // 如果有紀錄，預設選中第一篇
        if (parsed.length > 0) {
          loadRecord(parsed[0]);
        }
      } catch (e) {
        console.error("無法載入本地會議記錄", e);
      }
    } else {
      // 首次進入，載入第一個開發範例，讓使用者好上手
      applySample(SAMPLE_TRANSCRIPTS[0]);
    }
  }, []);

  // 2. 儲存更動至 LocalStorage
  const saveToLocalStorage = (newRecords: MeetingRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem("ai_meeting_notes_records", JSON.stringify(newRecords));
  };

  // 載入特定的紀錄
  const loadRecord = (record: MeetingRecord) => {
    setTitle(record.title);
    setTranscript(record.rawTranscript);
    setSelectedLanguage(record.language);
    setSelectedStyle(record.summaryStyle);
    setAdditionalInstructions(record.additionalInstructions);
    setResults(record.resultMarkdown);
    setActiveHistoryId(record.id);
    setErrorMsg(null);
  };

  // 應用範例資料
  const applySample = (sample: typeof SAMPLE_TRANSCRIPTS[0]) => {
    setTitle(sample.title);
    setTranscript(sample.transcript);
    setSelectedLanguage(sample.language);
    setSelectedStyle(sample.summaryStyle);
    setAdditionalInstructions(sample.additionalInstructions);
    setErrorMsg(null);
    // 開放式，不改變 outputs 除非使用者點生成
  };

  // 啟動全新的空白文稿
  const handleNewDocument = () => {
    setTitle("");
    setTranscript("");
    setSelectedLanguage("英文 English");
    setSelectedStyle("詳細會議記錄");
    setAdditionalInstructions("");
    setResults("");
    setActiveHistoryId(null);
    setErrorMsg(null);
  };

  // 刪除單筆紀錄
  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = records.filter(r => r.id !== id);
    saveToLocalStorage(updated);
    if (activeHistoryId === id) {
      if (updated.length > 0) {
        loadRecord(updated[0]);
      } else {
        handleNewDocument();
      }
    }
  };

  // 清空全部本地歷史
  const handleClearAllRecords = () => {
    if (window.confirm("您確定要清空所有的會議紀錄歷程嗎？此操作無法還原。")) {
      saveToLocalStorage([]);
      handleNewDocument();
    }
  };

  // 送出至後端進行 API 整理
  const handleGenerateAndTranslate = async () => {
    if (!transcript.trim()) {
      setErrorMsg("請輸入會議逐字稿或會議重點筆記！");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const docTitle = title.trim() || `會議記錄 - ${new Date().toLocaleDateString("zh-TW")} - ${selectedStyle}`;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: transcript,
          language: selectedLanguage,
          summaryStyle: selectedStyle,
          additionalInstructions: additionalInstructions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "生成失敗，伺服器可能出現錯誤。");
      }

      const data = await response.json();
      setResults(data.result);

      // 自動儲存到本地歷史
      const newRecord: MeetingRecord = {
        id: activeHistoryId || `rec_${Date.now()}`,
        title: docTitle,
        rawTranscript: transcript,
        language: selectedLanguage,
        summaryStyle: selectedStyle,
        additionalInstructions: additionalInstructions,
        resultMarkdown: data.result,
        createdAt: new Date().toISOString()
      };

      let updatedRecords;
      if (activeHistoryId) {
        // 更新現有紀錄
        updatedRecords = records.map(r => r.id === activeHistoryId ? newRecord : r);
      } else {
        // 新增記錄到最前頭
        updatedRecords = [newRecord, ...records];
        setActiveHistoryId(newRecord.id);
      }
      
      saveToLocalStorage(updatedRecords);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "通訊失敗，請確認伺服器或網路狀態。");
    } finally {
      setLoading(false);
    }
  };

  // 手動覆存目前設定與產出結果 (一般不需要，因為生成完會自動存，但提供按鈕很貼心)
  const handleManualSave = () => {
    if (!results) return;
    const docTitle = title.trim() || `會議記錄 - ${new Date().toLocaleDateString("zh-TW")} - ${selectedStyle}`;
    
    const newRecord: MeetingRecord = {
      id: activeHistoryId || `rec_${Date.now()}`,
      title: docTitle,
      rawTranscript: transcript,
      language: selectedLanguage,
      summaryStyle: selectedStyle,
      additionalInstructions: additionalInstructions,
      resultMarkdown: results,
      createdAt: new Date().toISOString()
    };

    let updatedRecords;
    if (activeHistoryId && records.some(r => r.id === activeHistoryId)) {
      updatedRecords = records.map(r => r.id === activeHistoryId ? newRecord : r);
    } else {
      updatedRecords = [newRecord, ...records];
      setActiveHistoryId(newRecord.id);
    }

    saveToLocalStorage(updatedRecords);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  // 一鍵複製功能
  const handleCopyResults = () => {
    if (!results) return;
    navigator.clipboard.writeText(results);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 導出 Markdown 檔案
  const handleDownloadMarkdown = () => {
    if (!results) return;
    const cleanTitle = (title.trim() || "AI_Meeting_Notes").replace(/\s+/g, "_");
    const element = document.createElement("a");
    const file = new Blob([results], { type: "text/markdown;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${cleanTitle}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 antialiased overflow-hidden h-screen" id="app-container">
      {/* 頂部導航列 (Minimalist Header) */}
      <nav className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between flex-shrink-0 z-10 shadow-sm" id="main-navigation">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-gray-900 block leading-none">
              AI 會議記錄生成與翻譯工具
            </span>
            <span className="text-[10px] text-gray-400 font-mono mt-1 block">
              MINIMAL MEETING COMPANION · TAIPEI WORKSPACE
            </span>
          </div>
        </div>

        {/* 快速按鈕區 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleNewDocument}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-all"
            title="開啟全新白卷"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>開新會議記錄</span>
          </button>
          
          <div className="hidden md:flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg text-xs font-medium">
            <span className="px-2 py-0.5 bg-white shadow-xs rounded text-gray-750 border border-gray-200/50 select-none">
              繁體中文 UI
            </span>
          </div>
          
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-300 ring-2 ring-white shadow-xs text-white flex items-center justify-center font-bold text-xs select-none">
            M
          </div>
        </div>
      </nav>

      {/* 主要工作區 layout (Bento Grid Columns) */}
      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden" id="workspace-grid">
        
        {/* 1. 左側欄：歷史會議存檔列表 - 佔 w-3 */}
        <div className="col-span-12 md:col-span-3 border-r border-gray-200 bg-slate-900 flex flex-col overflow-hidden p-3 gap-3" id="sidebar-panel">
          <HistorySidebar
            records={records}
            activeId={activeHistoryId}
            onSelectRecord={loadRecord}
            onDeleteRecord={handleDeleteRecord}
            onClearAll={handleClearAllRecords}
          />
        </div>

        {/* 2. 中間欄：輸入文稿、選項與動作發送 - 佔 w-4 */}
        <div className="col-span-12 md:col-span-4 border-r border-gray-200 bg-white flex flex-col overflow-y-auto p-5 space-y-4" id="input-panel">
          
          {/* 會議標題命名 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-between">
              <span>📌 會議主旨主題</span>
              <span className="text-[10px] font-mono font-medium text-gray-400">MEETING TITLE</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：2Q 敏捷技術架構與資料庫遷移會議"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition-all placeholder-gray-400"
              id="meeting-title-input"
            />
          </div>

          {/* 會議原始資料、貼入逐字稿 */}
          <div className="flex-1 flex flex-col space-y-1.5 min-h-[180px]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                <span>會議原始逐字稿 / 重點對話</span>
              </label>
              <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                字數: {transcript.length.toLocaleString()}
              </span>
            </div>
            
            <textarea
              className="flex-grow w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-505/20 focus:border-indigo-500 resize-none text-sm leading-relaxed outline-none transition-all font-mono font-normal"
              placeholder="請直接貼上會議軟體（Zoom、Teams、Meet 等）語音轉文字所得的逐字稿。您也可以直接輸入分部門口語的大綱重點..."
              spellCheck="false"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              id="transcript-textarea"
            />
          </div>

          {/* 範例快速測試 */}
          <div className="p-3 bg-gray-50/70 border border-gray-150 rounded-xl space-y-2">
            <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-indigo-500" />
              <span>快速套用演示範例</span>
            </span>
            <div className="grid grid-cols-1 gap-1.5 text-left">
              {SAMPLE_TRANSCRIPTS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => applySample(sample)}
                  className="px-2.5 py-1.5 text-xs text-left text-gray-700 bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 rounded-lg transition-all line-clamp-1 truncate block font-medium"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI 整理與翻譯參數 */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">AI 模型偏好設定</span>
            
            <div className="grid grid-cols-2 gap-3">
              {/* 目標翻譯語言 */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                  <Languages className="h-3 w-3 text-indigo-500" />
                  <span>翻譯目標語言</span>
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 outline-none focus:border-indigo-500 transition-colors"
                >
                  {TARGET_LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 摘要與產出風格 */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-indigo-500" />
                  <span>產出摘要風格</span>
                </label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-gray-800 outline-none focus:border-indigo-500 transition-colors"
                >
                  {SUMMARY_STYLES.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 額外自訂指令備註 */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">
                ✏️ 額外自訂吩咐 / 要求 (例如：特別關注某開發進度、限定關鍵字翻譯)
              </label>
              <input
                type="text"
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="例如：請著重列出研發部與 PM 待辦、用詞要求精準嚴謹..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs outline-none transition-all"
              />
            </div>
          </div>

          {/* 生成控制按鈕 */}
          <div className="pt-2">
            {errorMsg && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleGenerateAndTranslate}
              disabled={loading}
              className={`w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl font-semibold shadow-md shadow-indigo-100 active:scale-[0.98] flex items-center justify-center space-x-2.5 transition-all text-sm`}
              id="submit-generate-btn"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>正在生成極速極精確會議記錄...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5" />
                  <span>生成智慧總結與國際翻譯</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* 3. 右側欄：AI 解析與排版結果顯示區 (Markdown / Bento Box) - 佔 w-5 */}
        <div className="col-span-12 md:col-span-5 bg-gray-50 flex flex-col p-5 overflow-hidden" id="results-panel">
          
          {/* 結果的操作按鈕列 */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-indigo-500" />
              <span>AI 高級整理解析報表</span>
            </h2>

            {results && (
              <div className="flex space-x-1.5">
                {/* 複製按鈕 */}
                <button
                  onClick={handleCopyResults}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-650 hover:bg-gray-100 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-xs text-xs flex items-center gap-1"
                  title="複製完整 markdown 內容"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600">已複製</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製結果</span>
                    </>
                  )}
                </button>

                {/* 導出 Markdown 按鈕 */}
                <button
                  onClick={handleDownloadMarkdown}
                  className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-650 hover:bg-gray-100 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-xs text-xs flex items-center gap-1"
                  title="匯出為 .md 檔案"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下載文檔</span>
                </button>

                {/* 儲存更動按鈕 */}
                <button
                  onClick={handleManualSave}
                  className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 hover:bg-indigo-100 transition-all shadow-xs text-xs flex items-center gap-1 font-medium"
                  title="立即將更動與微調存檔至歷史庫"
                >
                  {justSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600">已存檔</span>
                    </>
                  ) : (
                    <span>💾 本地保存</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 主要結果展示卡片 (渲染成精緻美感的 Bento Card) */}
          <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm overflow-y-auto" id="results-display-card">
            {results ? (
              <div className="space-y-2 animate-fadeIn">
                <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">
                      {title.trim() || "會議整理簡報"}
                    </h1>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      GENERATED BY GEMINI · {activeHistoryId ? `紀錄 ID: ${activeHistoryId.substring(4, 10).toUpperCase()}` : "暫存稿"}
                    </p>
                  </div>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium border border-indigo-100/50">
                    {selectedLanguage}
                  </span>
                </div>

                <MarkdownRenderer content={results} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100 shadow-sm shadow-indigo-100/30">
                  <Sparkles className="w-8 h-8 opacity-90" />
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">準備就緒，等候會議逐字稿生成指令</h3>
                <p className="text-xs text-gray-500 max-w-sm leading-relaxed mb-6">
                  請於左側輸入您的會議逐字稿、選取偏好語言與摘要排版風格，隨之按下「生成」按鈕，立即享受高級智慧排版。
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => applySample(SAMPLE_TRANSCRIPTS[0])}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 font-semibold text-xs border border-indigo-100 rounded-xl transition-all"
                  >
                    🚀 載入「技術開發敏捷會議」範例
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* 底部頁尾列 (Compact Footer) */}
      <footer className="h-12 bg-white border-t border-gray-200 px-6 flex items-center justify-between text-xs text-gray-400 flex-shrink-0 z-10" id="main-footer">
        <div className="flex items-center space-x-6">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>API 連線狀態: <span className="text-green-600 font-semibold">智慧正常對齊</span></span>
          </span>
          <span className="h-3 w-px bg-gray-200 hidden sm:inline"></span>
          <span className="hidden sm:inline">
            背後引擎: <span className="font-semibold text-gray-600 font-mono">Gemini 3.5 Flash (低溫超嚴謹模式)</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span>&copy; {new Date().getFullYear()} AI 會議助理秘書官</span>
          <span>&bull;</span>
          <span className="text-indigo-650 hover:underline cursor-pointer flex items-center gap-0.5" onClick={() => applySample(SAMPLE_TRANSCRIPTS[0])}>
            2H 智慧敏捷自動化 <ExternalLink className="h-2.5 w-2.5 inline" />
          </span>
        </div>
      </footer>
    </div>
  );
}

