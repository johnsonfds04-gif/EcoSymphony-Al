import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  const aiAvailable = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({ status: 'ok', aiAvailable });
});

// 1. AI Waste Analysis Endpoint
app.post('/api/analyze-waste', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required for analysis.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Use Demo Mode or select a preloaded sample to test.',
        fallbackSuggested: true,
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    const resolvedMimeType = mimeType || 'image/jpeg';

    const prompt = `Analyze this photograph of waste or litter for the EcoSymphony AI municipal waste-intelligence prototype in Goa.
Important rules:
1. Identify the main waste category (e.g., "Plastic & Beverage Containers", "Mixed Municipal Waste", "Electronic Waste (E-Waste)", "Organic & Green Waste", "Paper & Cardboard", "Construction & Demolition Debris", "Glass & Metal").
2. List specific detected objects and material types (e.g., "PET plastic", "Aluminium", "HDPE", "Corrugated cardboard", "Organic matter", "Circuit boards / cables").
3. Determine if the waste is mixed ("Yes" or "No").
4. Determine if the waste is recyclable ("Yes", "No", or "Partially").
5. Determine if the waste is potentially hazardous ("Yes" or "No").
6. Describe the visible condition (e.g., "Scattered near roadside", "Overflowing near drainage", "Bundled dry recyclables").
7. Recommend a practical handling/disposal method and resource recovery stream.
8. Estimate the quantity category strictly as "Small", "Medium", or "Large" (NEVER claim exact weight in kg from a photograph).
9. Suggest an initial priority ("LOW", "MEDIUM", "HIGH", or "CRITICAL") and explain why based on visible quantity, hazard, or surroundings.
10. Provide an AI confidence percentage (between 60 and 98) and a concise explanation.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: resolvedMimeType,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainCategory: { type: Type.STRING },
            detectedObjects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            materials: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            mixedWaste: {
              type: Type.STRING,
              description: 'Must be "Yes" or "No"',
            },
            recyclable: {
              type: Type.STRING,
              description: 'Must be "Yes", "No", or "Partially"',
            },
            potentiallyHazardous: {
              type: Type.STRING,
              description: 'Must be "Yes" or "No"',
            },
            visibleCondition: { type: Type.STRING },
            recommendedAction: { type: Type.STRING },
            estimatedQuantity: {
              type: Type.STRING,
              description: 'Must be "Small", "Medium", or "Large"',
            },
            aiConfidence: { type: Type.NUMBER },
            explanation: { type: Type.STRING },
            suggestedPriority: {
              type: Type.STRING,
              description: 'Must be "LOW", "MEDIUM", "HIGH", or "CRITICAL"',
            },
            priorityReasoning: { type: Type.STRING },
            nearDrainageDetected: { type: Type.BOOLEAN },
            publicAreaDetected: { type: Type.BOOLEAN },
            overflowingDetected: { type: Type.BOOLEAN },
            recoveryStreams: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  material: { type: Type.STRING },
                  stream: { type: Type.STRING },
                },
                required: ['material', 'stream'],
              },
            },
          },
          required: [
            'mainCategory',
            'detectedObjects',
            'materials',
            'mixedWaste',
            'recyclable',
            'potentiallyHazardous',
            'visibleCondition',
            'recommendedAction',
            'estimatedQuantity',
            'aiConfidence',
            'explanation',
            'suggestedPriority',
            'priorityReasoning',
            'recoveryStreams',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: 'Empty response from Gemini Vision model.' });
    }

    const parsed = JSON.parse(text.trim());
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/analyze-waste:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to analyze waste image with Gemini Vision.',
      fallbackSuggested: true,
    });
  }
});

// 2. Before / After Cleanup Verification Endpoint
app.post('/api/verify-cleanup', async (req, res) => {
  try {
    const { beforeImageBase64, afterImageBase64, afterMimeType } = req.body;
    if (!afterImageBase64) {
      return res.status(400).json({ error: 'After-cleanup photo is required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured for live verification.',
        fallbackSuggested: true,
      });
    }

    const cleanAfter = afterImageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    const parts: any[] = [];

    if (beforeImageBase64 && beforeImageBase64.startsWith('data:image/')) {
      const cleanBefore = beforeImageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBefore,
        },
      });
    }

    parts.push({
      inlineData: {
        mimeType: afterMimeType || 'image/jpeg',
        data: cleanAfter,
      },
    });

    parts.push({
      text: `Compare or inspect the after-cleanup image to assess whether the reported waste has been cleared.
Important rules:
- Do NOT claim 100% perfect certainty; final verification is always performed by an authorized human supervisor.
- Set verdict strictly to either "Cleanup appears successful" or "Waste still appears visible – manual verification recommended".
- Provide a clear, factual observation note.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: {
              type: Type.STRING,
              description:
                'Must be "Cleanup appears successful" or "Waste still appears visible – manual verification recommended"',
            },
            wasteStillVisible: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            notes: { type: Type.STRING },
          },
          required: ['verdict', 'wasteStillVisible', 'confidence', 'notes'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: 'Empty verification response from Gemini.' });
    }

    return res.json(JSON.parse(text.trim()));
  } catch (err: any) {
    console.error('Error in /api/verify-cleanup:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to verify cleanup image.',
      fallbackSuggested: true,
    });
  }
});

// 3. Ask EcoSymphony AI (Grounded strictly in stored incident data)
app.post('/api/ask-assistant', async (req, res) => {
  try {
    const { question, incidents, dataMode } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API is unavailable; using local deterministic data query.',
        fallbackSuggested: true,
      });
    }

    const compactIncidents = (Array.isArray(incidents) ? incidents : []).map((inc: any) => ({
      id: inc.id,
      dateTime: inc.dateTime,
      wasteType: inc.wasteType,
      materials: inc.materials,
      mixedWaste: inc.mixedWaste,
      recyclable: inc.recyclable,
      potentiallyHazardous: inc.potentiallyHazardous,
      estimatedQuantity: inc.estimatedQuantity,
      priority: inc.priority,
      status: inc.status,
      area: inc.location?.area,
      localBody: inc.location?.localBody,
      recommendedAction: inc.recommendedAction,
    }));

    const systemInstruction = `You are the "Ask EcoSymphony AI" analytical assistant for the EcoSymphony AI Waste Intelligence Dashboard in Goa.
CRITICAL RULES:
1. Answer ONLY using the exact incident records provided in the prompt JSON (${compactIncidents.length} records currently in ${dataMode} mode).
2. If the provided incident records do not contain enough information to answer the question, or if the dataset is empty, reply with: "Insufficient data."
3. Never invent external municipal statistics, government budgets, exact weights not in the data, or unrecorded incidents.
4. Keep answers concise, factual, and directly helpful to municipal waste coordinators, citing Incident IDs (e.g., ES-0001) where relevant.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Current Stored Incidents JSON:\n${JSON.stringify(compactIncidents, null, 2)}\n\nUser Question: ${question}`,
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    });

    return res.json({
      answer: response.text || 'Insufficient data.',
      sourceCount: compactIncidents.length,
    });
  } catch (err: any) {
    console.error('Error in /api/ask-assistant:', err);
    return res.status(500).json({
      error: err?.message || 'Assistant query failed.',
      fallbackSuggested: true,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EcoSymphony AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
