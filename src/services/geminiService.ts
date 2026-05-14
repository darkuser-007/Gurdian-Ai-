import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the correct SDK and model aliases
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

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
      model: "gemini-3.1-pro-preview",
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
      throw new Error("Empty response from AI model");
    }
    
    try {
      return JSON.parse(text) as AIAnalysisResult;
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", text);
      throw new Error("Invalid AI response format");
    }
  } catch (error: any) {
    console.error("Gemini Audio Analysis Error:", error);
    
    // Check for quota exceeded error (Common in free tier)
    if (error?.message?.includes("quota") || error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429) {
      throw new Error("QUOTA_EXCEEDED: Gemini AI rate limit reached. Please wait a minute before retrying.");
    }
    
    throw error;
  }
}
