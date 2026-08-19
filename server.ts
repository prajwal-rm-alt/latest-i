import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // API Route for Gemini extraction
  app.post("/api/extract-bill", async (req, res) => {
    try {
      const { base64Data, userApiKey } = req.body;
      const apiKey = userApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ error: "API Key not found." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [
            {
                role: "user",
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: base64Data } },
                    { text: `Extract information from this bill image in a structured JSON format. 
                    Fields to extract:
                    - date (YYYY-MM-DD)
                    - customerName
                    - customerPhone (10 digits)
                    - billId (Invoice number)
                    - txnNumber (Transaction reference if any)
                    - items (Array of objects with productName, quantity, price)
                    - isGeyserFound (Boolean, true if any item is a Geyser or Water Heater)
                    - rawText (A complete transcription of all text found on the bill)

                    Return ONLY the JSON object.` }
                ]
            }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING },
                    customerName: { type: Type.STRING },
                    customerPhone: { type: Type.STRING },
                    billId: { type: Type.STRING },
                    txnNumber: { type: Type.STRING },
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                productName: { type: Type.STRING },
                                quantity: { type: Type.NUMBER },
                                price: { type: Type.NUMBER }
                            },
                            required: ["productName", "quantity", "price"]
                        }
                    },
                    isGeyserFound: { type: Type.BOOLEAN },
                    rawText: { type: Type.STRING }
                },
                required: ["items", "isGeyserFound"]
            }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Extraction Error:", error);
      res.status(500).json({ error: error.message || "Failed to extract bill details." });
    }
  });

  // API Route for Coach message
  app.post("/api/coach-message", async (req, res) => {
    try {
      const { message, user, sales, history, userApiKey } = req.body;
      const apiKey = userApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(400).json({ error: "API_KEY_MISSING" });

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const chat = ai.chats.create({
          model: "gemini-3.7-flash",
          config: {
              systemInstruction: `You are a Bajaj Sales Coach for ${user?.name || 'Executive'} at ${user?.storeName || 'Store'}. 
              Your goal is to help them sell more Bajaj products. 
              Be encouraging, professional, and data-driven. 
              Current Sales Data: ${JSON.stringify((sales || []).slice(-5))}
              Today is ${new Date().toLocaleDateString()}.`
          },
          history: (history || []).map((m: any) => ({
              role: m.role,
              parts: [{ text: m.text }]
          }))
      });

      const response = await chat.sendMessage({ message });
      res.json({ text: response.text || "I'm not sure how to respond to that." });
    } catch (error: any) {
      console.error("Coach Error:", error);
      res.status(500).json({ error: error.message || "Failed to chat" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await import("vite");
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(viteServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
