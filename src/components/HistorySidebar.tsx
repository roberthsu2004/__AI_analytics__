import React from "react";
import { MeetingRecord } from "../types";
import { History, Trash2, Calendar, Languages, Clipboard, Award } from "lucide-react";

interface HistorySidebarProps {
  records: MeetingRecord[];
  activeId: string | null;
  onSelectRecord: (record: MeetingRecord) => void;
  onDeleteRecord: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
}

export default function HistorySidebar({
  records,
  activeId,
  onSelectRecord,
  onDeleteRecord,
  onClearAll,
}: HistorySidebarProps) {
  return (
    <div className="bg-slate-900 text-slate-100 h-full flex flex-col rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* 側欄標題 */}
      <div className="p-4 border-b border-slate-850 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-400" />
          <h2 className="font-semibold tracking-wide text-sm md:text-base">歷史會議庫</h2>
        </div>
        <span className="bg-slate-800 text-indigo-300 text-xs font-mono px-2 py-0.5 rounded-full select-none">
          {records.length}
        </span>
      </div>

      {/* 記錄列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {records.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Clipboard className="h-10 w-10 mb-2 stroke-[1.2] text-slate-600" />
            <p className="text-xs">尚無任何會議存檔</p>
            <p className="text-[10px] mt-1 text-slate-600">產出後的會議記錄將會儲存在您的瀏覽器中</p>
          </div>
        ) : (
          records.map((record) => {
            const isActive = activeId === record.id;
            const formattedDate = new Date(record.createdAt).toLocaleDateString("zh-TW", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div
                key={record.id}
                onClick={() => onSelectRecord(record)}
                className={`group relative p-3 rounded-xl cursor-pointer border transition-all duration-200 flex flex-col gap-1.5 ${
                  isActive
                    ? "bg-indigo-600/90 border-indigo-500/80 text-white shadow-md shadow-indigo-600/10"
                    : "bg-slate-850/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300"
                }`}
              >
                {/* 刪除按鈕 */}
                <button
                  onClick={(e) => onDeleteRecord(record.id, e)}
                  title="刪除紀錄"
                  className={`absolute right-2 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                    isActive 
                      ? "hover:bg-indigo-700 text-indigo-200 hover:text-white" 
                      : "hover:bg-slate-700 text-slate-500 hover:text-rose-400"
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <div className="pr-6">
                  <h3 className="font-medium text-xs leading-tight line-clamp-1 group-hover:text-white">
                    {record.title || "未命名會議"}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-[10px] text-slate-400">
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md ${
                    isActive ? "bg-indigo-750 text-indigo-100" : "bg-slate-800 text-indigo-300"
                  }`}>
                    <Languages className="h-2.5 w-2.5" />
                    {record.language.split(" ")[0]}
                  </span>
                  
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md ${
                    isActive ? "bg-indigo-750 text-indigo-100" : "bg-slate-800 text-indigo-300"
                  }`}>
                    <Award className="h-2.5 w-2.5" />
                    {record.summaryStyle}
                  </span>

                  <span className="inline-flex items-center gap-1 opacity-80 text-[9px] font-mono ml-auto">
                    <Calendar className="h-2.5 w-2.5" />
                    {formattedDate}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 清除全部按鈕 */}
      {records.length > 0 && (
        <div className="p-3 border-t border-slate-850 bg-slate-950/40">
          <button
            onClick={onClearAll}
            className="w-full text-center py-2 rounded-lg text-xs bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 hover:border hover:border-rose-900/50 transition-colors text-slate-400"
          >
            🧹 清空本地歷程
          </button>
        </div>
      )}
    </div>
  );
}
