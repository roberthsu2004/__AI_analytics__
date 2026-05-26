import React, { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
}

// 輔助函式：解析行內 **粗體** 和 `行內程式碼`
const renderInlineMarkdown = (text: string): React.ReactNode => {
  if (!text) return "";
  const parts: React.ReactNode[] = [];
  let currentIdx = 0;
  const regex = /(\*\*|`)(.*?)\1/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const type = match[1]; // '**' 或 '`'
    const content = match[2];

    // 貼上匹配前的一般文字
    if (matchStart > currentIdx) {
      parts.push(text.substring(currentIdx, matchStart));
    }

    if (type === '**') {
      parts.push(
        <strong key={`bold-${matchStart}`} className="font-bold text-gray-900 border-b-2 border-indigo-200/60 pb-0.5">
          {content}
        </strong>
      );
    } else if (type === '`') {
      parts.push(
        <code key={`code-${matchStart}`} className="px-1.5 py-0.5 text-xs font-mono bg-indigo-50 text-indigo-600 rounded border border-indigo-100/80">
          {content}
        </code>
      );
    }

    currentIdx = regex.lastIndex;
  }

  if (currentIdx < text.length) {
    parts.push(text.substring(currentIdx));
  }

  return parts.length > 0 ? <>{parts}</> : text;
};

// 用來優化單行的項目，偵測是否是 action item 清單
const renderListItem = (lineText: string, idx: number) => {
  // 過濾 - 或 *
  const cleanText = lineText.replace(/^[\s-*+]+/, '').trim();
  
  // 如果 cleanText 包含 [ ] 或 [x]，可以模擬核取方塊
  const isChecked = cleanText.startsWith('[x]') || cleanText.startsWith('[X]');
  const isUnchecked = cleanText.startsWith('[ ]');
  
  if (isChecked || isUnchecked) {
    const finalTaskText = cleanText.substring(3).trim();
    return (
      <li key={idx} className="flex items-start gap-2.5 my-2 text-sm text-gray-700">
        <input 
          type="checkbox" 
          checked={isChecked} 
          readOnly 
          className="mt-1 h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-default"
        />
        <span className={isChecked ? "line-through text-gray-400" : "text-gray-700"}>
          {renderInlineMarkdown(finalTaskText)}
        </span>
      </li>
    );
  }

  return (
    <li key={idx} className="flex items-start gap-2.5 my-1.5 text-sm leading-relaxed text-gray-700">
      <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
      <span className="flex-1">{renderInlineMarkdown(cleanText)}</span>
    </li>
  );
};

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    
    let currentBlock: { type: 'list' | 'card' | 'none'; lines: string[]; title?: string; icon?: string } = {
      type: 'none',
      lines: []
    };

    const flushBlock = (keyPrefix: string) => {
      if (currentBlock.lines.length === 0) return;

      if (currentBlock.type === 'list') {
        elements.push(
          <ul key={`list-${keyPrefix}`} className="my-1.5 pl-1 space-y-1">
            {currentBlock.lines.map((l, i) => renderListItem(l, i))}
          </ul>
        );
      } else if (currentBlock.type === 'card') {
        // Bento card style!
        const bentoStyle = getBentoStyleByIcon(currentBlock.icon || "📝");
        elements.push(
          <div 
            key={`bento-${keyPrefix}`} 
            className={`my-6 overflow-hidden rounded-xl border border-gray-150 shadow-sm bg-white hover:shadow-md transition-all duration-300 ${bentoStyle.borderLeft}`}
            id={`section-${keyPrefix}`}
          >
            {/* 卡片標頭 */}
            <div className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between ${bentoStyle.headerBg}`}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl flex-shrink-0">{currentBlock.icon}</span>
                <span className="font-semibold text-gray-900 tracking-tight text-sm md:text-base">
                  {currentBlock.title}
                </span>
              </div>
              <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${bentoStyle.badgeClass}`}>
                {bentoStyle.tagText}
              </span>
            </div>
            
            {/* 卡片內容 */}
            <div className="p-4 md:p-5 bg-white space-y-3 leading-relaxed">
              {parseCardBody(currentBlock.lines)}
            </div>
          </div>
        );
      } else {
        // none / text block
        elements.push(
          <div key={`text-${keyPrefix}`} className="space-y-2 text-sm text-gray-700 leading-relaxed my-2">
            {currentBlock.lines.map((l, i) => (
              <p key={i}>{renderInlineMarkdown(l)}</p>
            ))}
          </div>
        );
      }

      currentBlock = { type: 'none', lines: [] };
    };

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const trimmed = line.trim();

      if (trimmed === '') {
        continue;
      }

      // 檢查是否為卡片標題（Bento box）
      const h3Match = trimmed.match(/^###\s+(.+)$/);
      const h2Match = trimmed.match(/^##\s+(.+)$/);
      
      // 自動偵測 1. **會議主題與時間** 或 **待辦事項** 形式的標題
      const boldHeadingMatch = trimmed.match(/^(\d+\.\s+)?\*\*(.+?)\*\*[:：]?$/);

      if (h3Match || h2Match || boldHeadingMatch) {
        flushBlock(`${index}-pre`);
        
        let fullTitle = "";
        if (h3Match) fullTitle = h3Match[1].trim();
        else if (h2Match) fullTitle = h2Match[1].trim();
        else if (boldHeadingMatch) fullTitle = boldHeadingMatch[2].trim();
        
        // 提取或動態配對 Emojis 作為圖示
        const emojiMatch = fullTitle.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji})/u);
        let icon = emojiMatch ? emojiMatch[0] : "📝";
        let titleWithoutIcon = emojiMatch ? fullTitle.substring(emojiMatch[0].length).trim() : fullTitle;

        if (!emojiMatch) {
          // 動態根據關鍵字關聯 emoji 圖示
          if (titleWithoutIcon.includes("主題") || titleWithoutIcon.includes("時間") || titleWithoutIcon.includes("Topic")) {
            icon = "📅";
          } else if (titleWithoutIcon.includes("與會") || titleWithoutIcon.includes("人員") || titleWithoutIcon.includes("成員") || titleWithoutIcon.includes("Attendee")) {
            icon = "👥";
          } else if (titleWithoutIcon.includes("重點") || titleWithoutIcon.includes("總結") || titleWithoutIcon.includes("摘要") || titleWithoutIcon.includes("Summary")) {
            icon = "📌";
          } else if (titleWithoutIcon.includes("待辦") || titleWithoutIcon.includes("行動") || titleWithoutIcon.includes("Action")) {
            icon = "📝";
          } else if (titleWithoutIcon.includes("英文") || titleWithoutIcon.includes("翻譯") || titleWithoutIcon.includes("English") || titleWithoutIcon.includes("Translation")) {
            icon = "🌐";
          }
        }

        currentBlock = {
          type: 'card',
          lines: [],
          title: titleWithoutIcon,
          icon: icon
        };
        continue;
      }

      // 檢查是否為清單項目
      const isList = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ');
      if (isList) {
        if (currentBlock.type !== 'list' && currentBlock.type !== 'card') {
          flushBlock(`${index}-pre`);
          currentBlock = { type: 'list', lines: [] };
        }
        currentBlock.lines.push(line);
      } else {
        // 如果目前是其它的 block（例如卡片），我們就把內容加入卡片 lines
        if (currentBlock.type === 'card') {
          currentBlock.lines.push(line);
        } else if (currentBlock.type === 'list') {
          flushBlock(`${index}-list-end`);
          currentBlock = { type: 'none', lines: [line] };
        } else {
          currentBlock.lines.push(line);
        }
      }
    }

    // 沖刷最後一個區塊
    flushBlock('final');

    return elements;
  }, [content]);

  return (
    <div className="font-sans antialiased text-gray-800 space-y-4">
      {renderedElements || (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-sm font-medium">尚無格式化結果，請先輸入並生成記錄</p>
        </div>
      )}
    </div>
  );
}

// 根據 圖示 賦予卡片特定的 Tailwind 樣式設計
function getBentoStyleByIcon(icon: string) {
  switch (icon) {
    case '📅':
      return {
        borderLeft: 'border-l-[4px] border-l-blue-500',
        headerBg: 'bg-blue-50/50',
        badgeClass: 'bg-blue-100 text-blue-700',
        tagText: 'BASIC INFO'
      };
    case '👥':
      return {
        borderLeft: 'border-l-[4px] border-l-teal-500',
        headerBg: 'bg-teal-50/40',
        badgeClass: 'bg-teal-100 text-teal-800',
        tagText: 'ATTENDEES'
      };
    case '🎯':
      return {
        borderLeft: 'border-l-[4px] border-l-amber-500',
        headerBg: 'bg-amber-50/30',
        badgeClass: 'bg-amber-100 text-amber-800',
        tagText: 'GOALS & PURPOSE'
      };
    case '📌':
      return {
        borderLeft: 'border-l-[4px] border-l-indigo-500',
        headerBg: 'bg-indigo-50/40',
        badgeClass: 'bg-indigo-100 text-indigo-700',
        tagText: 'KEY DISCUSSIONS'
      };
    case '💡':
      return {
        borderLeft: 'border-l-[4px] border-l-emerald-500',
        headerBg: 'bg-emerald-50/30',
        badgeClass: 'bg-emerald-100 text-emerald-800',
        tagText: 'DECISIONS & AGREEMENTS'
      };
    case '📝':
      return {
        borderLeft: 'border-l-[4px] border-l-purple-500',
        headerBg: 'bg-purple-50/30',
        badgeClass: 'bg-purple-100 text-purple-700',
        tagText: 'ACTION ITEMS'
      };
    case '🌐':
      return {
        borderLeft: 'border-l-[4px] border-l-sky-500',
        headerBg: 'bg-sky-50/40',
        badgeClass: 'bg-sky-100 text-sky-800',
        tagText: 'ENGLISH TRANSLATION'
      };
    default:
      return {
        borderLeft: 'border-l-[4px] border-l-gray-400',
        headerBg: 'bg-gray-50/50',
        badgeClass: 'bg-gray-100 text-gray-700',
        tagText: 'MEETING NOTES'
      };
  }
}

// 輔助解析：卡片內部可能同時帶有清單或一般段落
function parseCardBody(lines: string[]): React.ReactNode {
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`card-list-${key}`} className="space-y-2 mt-1.5 pl-0.5">
        {listBuffer.map((l, i) => renderListItem(l, i))}
      </ul>
    );
    listBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const isList = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ');
    
    if (isList) {
      listBuffer.push(line);
    } else {
      flushList(`${i}-pre`);
      if (trimmed.startsWith('>')) {
        // blockquote!
        elements.push(
          <blockquote key={i} className="pl-4 border-l-4 border-indigo-200 italic my-2 text-sm text-gray-600 bg-gray-50/50 py-1.5 pr-2 rounded-r">
            {renderInlineMarkdown(trimmed.substring(1).trim())}
          </blockquote>
        );
      } else {
        // 一般文字 line
        elements.push(
          <p key={i} className="text-sm text-gray-700 leading-relaxed font-normal">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      }
    }
  }

  flushList('final');
  return <>{elements}</>;
}
