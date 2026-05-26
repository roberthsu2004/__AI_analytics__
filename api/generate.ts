import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// ── 本地開發環境變數載入保護 ─────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      envContent.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const index = trimmed.indexOf("=");
          if (index !== -1) {
            const key = trimmed.substring(0, index).trim();
            const value = trimmed.substring(index + 1).trim();
            if (key) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  } catch (e) {
    console.error("無法手動載入 .env.local", e);
  }
}


// ── 系統提示詞（共用）──────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
你是一位專業的會議記錄助理。請根據使用者提供的會議逐字稿，整理出結構化的會議紀錄。
請務必遵守以下輸出格式要求：

1. **會議主題與時間**：擷取會議的主題與時間。
2. **與會者**：列出參與會議的人員。
3. **會議重點總結**：用 3 到 5 個重點總結會議內容。
4. **Action Items (待辦事項)**：明確列出接下來的待辦事項與負責人。
5. **英文翻譯版**：將上述 1~4 點的內容完整翻譯成專業的英文。

請以 Markdown 格式輸出，所有繁體中文部分必須使用**繁體中文**回覆，不要包含任何額外的問候語或結語。
`;

// ── 建立 Prompt ──────────────────────────────────────────────────────────
function buildPrompt(
  transcript: string,
  language: string,
  summaryStyle: string,
  additionalInstructions: string
): string {
  return `請幫我處理並整理以下會議原始紀錄與逐字稿：

【會議原始資料/逐字稿內容】：
"""
${transcript}
"""

【目標翻譯語言】：
${language || "繁體中文"}

【產出摘要風格】：
${summaryStyle || "詳細會議記錄"}

【額外自訂要求/備註】：
${additionalInstructions || "無"}

請根據上述設定生成合適的會議記錄與翻譯，請確保輸出格式具有極佳的排版視覺，並保留 Markdown 的豐富語法。現在請開始：`;
}

// ── Gemini 呼叫 ──────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "伺服器未設定 GEMINI_API_KEY。請在 Vercel 後台或 .env.local 中設定此環境變數。"
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini API 回傳空內容。");
  return text;
}

// ── NVIDIA 呼叫（OpenAI-compatible REST）─────────────────────────────────
async function callNvidia(prompt: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "伺服器未設定 NVIDIA_API_KEY。請在 Vercel 後台或 .env.local 中設定此環境變數。"
    );
  }

  const response = await fetch(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "minimaxai/minimax-m2.7",
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`NVIDIA API 錯誤 (${response.status}): ${errBody}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("NVIDIA API 回傳空內容。");
  return text;
}

// ── Vercel Serverless Handler ─────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 僅允許 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { provider, transcript, language, summaryStyle, additionalInstructions } =
    req.body as {
      provider?: string;
      transcript?: string;
      language?: string;
      summaryStyle?: string;
      additionalInstructions?: string;
    };

  // 驗證必填欄位
  if (!transcript || transcript.trim() === "") {
    return res.status(400).json({ error: "會議原始資料不能為空。" });
  }

  const selectedProvider = provider === "nvidia" ? "nvidia" : "gemini";
  const prompt = buildPrompt(
    transcript,
    language ?? "繁體中文",
    summaryStyle ?? "詳細會議記錄",
    additionalInstructions ?? "無"
  );

  try {
    let resultText: string;

    if (selectedProvider === "nvidia") {
      resultText = await callNvidia(prompt);
    } else {
      resultText = await callGemini(prompt);
    }

    return res.status(200).json({ result: resultText });
  } catch (error: unknown) {
    console.error(`[${selectedProvider.toUpperCase()}] API Error:`, error);
    const message =
      error instanceof Error ? error.message : "呼叫 AI 服務時發生未知錯誤。";
    return res.status(500).json({ error: message });
  }
}
