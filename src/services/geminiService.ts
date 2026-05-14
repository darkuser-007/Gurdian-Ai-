import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client lazily to ensure environment variables are loaded
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("MISSING_API_KEY: Gemini API Key is missing. Please add your GEMINI_API_KEY in the Settings menu (API Keys & Secrets).");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface AIAnalysisResult {
  riskScore: number;
  verdict: 'authentic' | 'suspicious' | 'deepfake';
  explanation: string;
  signals: string[];
}

/**
 * Analyzes an audio file for deepfake/synthetic characteristics using Gemini.
 */
export async function analyzeAudioForDeepfake(fileBase64: string, mimeType: string): Promise<AIAnalysisResult> {
  try {
    const ai = getAiClient();

    const prompt = `
      You are a world-class Forensic Audio Engineer and Neural Biometrics Specialist. 
      Your mission is to perform a high-fidelity audit of the provided audio to detect AI-generated synthetic speech (Deepfakes).
      
      Perform an exhaustive analysis looking for:
      1. Neural Vocoder Artifacts: Robotic metallic resonances or subtle phasing issues in vocal formants often left by models like RVC, ElevenLabs, or Vall-E.
      2. Spectral Anomalies: Gaps in the frequency spectrum, especially in higher harmonics, where synthetic models often fail to replicate natural timbre.
      3. Physiological Inconsistencies: Lack of micro-fluctuations in pitch (micro-tremors), missing breath intake patterns, or unnatural co-articulation (the way phonemes blend).
      4. Temporal Jitter: Subtle timing irregularities in the digital clocking of the vocal synthesis.
      5. Impulse Response Consistency: Check if the "room acoustics" or background noise floor remains perfectly consistent or shifts unnaturally between words.
      
      You must be extremely critical. If you detect even subtle hints of synthetic generation, mark it as suspicious or deepfake.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: fileBase64,
              mimeType: mimeType
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: {
              type: Type.NUMBER,
              description: "Forensic certainty score (0-100) where 100 is definitely deepfake.",
            },
            verdict: {
              type: Type.STRING,
              enum: ["authentic", "suspicious", "deepfake"],
              description: "The binary or tiered forensic conclusion.",
            },
            explanation: {
              type: Type.STRING,
              description: "Detailed forensic summary of the artifacts detected.",
            },
            signals: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Specific technical anomalies identified (e.g., 'spectral_envelope_mismatch', 'vocoder_resonance').",
            },
          },
          required: ["riskScore", "verdict", "explanation", "signals"],
        }
      }
    });

    const text = response.text;
    
    if (!text) {
      if (response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error("SAFETY_BLOCKED: The AI flagged the audio file as potentially harmful or violating safety guidelines.");
      }
      throw new Error("Empty response from AI model");
    }
    
    try {
      return JSON.parse(text) as AIAnalysisResult;
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", text);
      throw new Error("Invalid AI response format");
    }
  } catch (error: any) {
    console.error("Gemini Audio Analysis Error Detail:", error);
    
    // Check for quota exceeded error (Common in free tier)
    if (error?.message?.includes("quota") || error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429 || error?.message?.includes("429")) {
      throw new Error("QUOTA_EXCEEDED: Gemini AI rate limit reached. Please wait a minute before retrying.");
    }
    
    if (error?.message?.includes("PERMISSION_DENIED")) {
      throw new Error("PERMISSION_DENIED: API Key issues. Please check your Gemini API key in settings.");
    }
    
    throw error;
  }
}
