import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// 載入環境變數
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 允許解析 JSON payload，設定大容量上限以應對大型逐字稿
  app.use(express.json({ limit: '20mb' }));

  // 初始化 Gemini API 客戶端
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API 1: 處理會議記錄生成與翻譯
  app.post("/api/generate", async (req, res) => {
    try {
      const { transcript, language, summaryStyle, additionalInstructions } = req.body;

      if (!transcript || transcript.trim() === "") {
        return res.status(400).json({ error: "會議原始資料不能為空。" });
      }

      if (!apiKey) {
        return res.status(500).json({ 
          error: "伺服器未設定 GEMINI_API_KEY 密鑰。請在 Google AI Studio 的 Settings > Secrets 側邊欄設定您的 Gemini 金鑰。" 
        });
      }

      const systemInstruction = `
你是一位專業的會議記錄助理。請根據使用者提供的會議逐字稿，整理出結構化的會議紀錄。
請務必遵守以下輸出格式要求：

1. **會議主題與時間**：擷取會議的主題與時間。
2. **與會者**：列出參與會議的人員。
3. **會議重點總結**：用 3 到 5 個重點總結會議內容。
4. **Action Items (待辦事項)**：明確列出接下來的待辦事項與負責人。
5. **英文翻譯版**：將上述 1~4 點的內容完整翻譯成專業的英文。

請以 Markdown 格式輸出，所有繁體中文部分必須使用**繁體中文**回覆，不要包含任何額外的問候語或結語。
`;

      const promptTemplate = `
請幫我處理並整理以下會議原始紀錄與逐字稿：

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

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptTemplate,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2, // 調低溫度使結果條理和邏輯更嚴謹
        }
      });

      const resultText = response.text;
      return res.json({ result: resultText });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({ error: error.message || "呼叫 Gemini AI 服務時發生未知內部錯誤。" });
    }
  });

  // Vite middleware 整合
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
