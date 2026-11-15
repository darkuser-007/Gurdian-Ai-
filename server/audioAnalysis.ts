import { GoogleGenAI, Type } from "@google/genai";

const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const MAX_AUDIO_BASE64_LENGTH = Math.ceil(MAX_AUDIO_BYTES / 3) * 4;
const MAX_MIME_TYPE_LENGTH = 128;
const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/aac", "audio/aiff", "audio/flac", "audio/m4a", "audio/mp3",
  "audio/mp4", "audio/mpeg", "audio/mpga", "audio/ogg", "audio/opus",
  "audio/pcm", "audio/wav", "audio/webm", "audio/x-aac", "audio/l16",
  "audio/alaw", "audio/mulaw"
]);

export interface AIAnalysisResult {
  riskScore: number;
  verdict: "authentic" | "suspicious" | "deepfake";
  explanation: string;
  signals: string[];
}

export class AudioAnalysisError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "AudioAnalysisError";
  }
}

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AudioAnalysisError(
      "The server is missing GEMINI_API_KEY. Add it to the deployment environment.",
      503,
      "MISSING_API_KEY"
    );
  }
  if (!aiClient) aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

export function validateAudioInput(audioBase64: unknown, mimeType: unknown) {
  if (typeof audioBase64 !== "string" || audioBase64.length === 0) {
    throw new AudioAnalysisError("Audio data is required.", 400, "INVALID_AUDIO");
  }
  // Reject oversized encoded input before allocating a decoded Buffer.
  if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
    throw new AudioAnalysisError("Audio files must be 3 MB or smaller. Trim the recording and try again.", 413, "FILE_TOO_LARGE");
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(audioBase64)) {
    throw new AudioAnalysisError("Audio data must be valid base64.", 400, "INVALID_AUDIO");
  }

  const audioBytes = Buffer.from(audioBase64, "base64");
  if (audioBytes.length === 0) {
    throw new AudioAnalysisError("The uploaded audio file is empty.", 400, "INVALID_AUDIO");
  }
  if (audioBytes.length > MAX_AUDIO_BYTES) {
    throw new AudioAnalysisError("Audio files must be 3 MB or smaller. Trim the recording and try again.", 413, "FILE_TOO_LARGE");
  }
  if (typeof mimeType !== "string") {
    throw new AudioAnalysisError("An audio MIME type is required.", 400, "INVALID_AUDIO_TYPE");
  }

  const normalizedMimeType = mimeType.toLowerCase().split(";")[0].trim();
  if (mimeType.length > MAX_MIME_TYPE_LENGTH || !SUPPORTED_AUDIO_TYPES.has(normalizedMimeType)) {
    const safeMimeType = normalizedMimeType.slice(0, MAX_MIME_TYPE_LENGTH) || "unknown";
    throw new AudioAnalysisError("Unsupported audio type: " + safeMimeType + ".", 415, "UNSUPPORTED_AUDIO_TYPE");
  }
  return { audioBase64, mimeType: normalizedMimeType };
}

/**
 * Gemini provides an audio-content screening signal, not a validated
 * anti-spoofing classifier or proof that a voice is authentic/fake.
 */
export async function analyzeAudioForDeepfake(
  audioBase64: unknown,
  mimeType: unknown
): Promise<AIAnalysisResult> {
  const audio = validateAudioInput(audioBase64, mimeType);

  try {
    const ai = getAiClient();
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const prompt = [
      "Review the supplied audio for characteristics that may be consistent with synthetic or manipulated speech.",
      "",
      "Important limitations:",
      "- You are a general multimodal language model, not a validated anti-spoofing or speaker-authentication classifier.",
      "- Do not claim that this recording is definitively authentic or a deepfake.",
      "- Do not invent acoustic measurements, spectrogram findings, model metadata, or technical artifacts that you cannot directly establish from the supplied audio.",
      "- Do not treat background noise, compression, accent, emotion, or recording quality alone as evidence of synthetic speech.",
      "- Use a cautious screening concern score from 0 to 100. This is not a probability, confidence interval, or verified forensic measurement.",
      "- When the audio is short, noisy, non-speech, or ambiguous, explain the limitation and use a cautious suspicious result rather than asserting certainty.",
      "- Include only audible, supportable observations in signals and explanation.",
      "- Recommend independent verification for consequential decisions.",
      "",
      "Return JSON with: riskScore (integer 0-100, screening concern only), verdict (authentic, suspicious, or deepfake; screening category, not proof), explanation (evidence-based with uncertainty), and signals (short list of audible observations)."
    ].join("\n");

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: audio.audioBase64, mimeType: audio.mimeType } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.INTEGER, minimum: 0, maximum: 100 },
            verdict: { type: Type.STRING, enum: ["authentic", "suspicious", "deepfake"] },
            explanation: { type: Type.STRING },
            signals: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["riskScore", "verdict", "explanation", "signals"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      if (response.candidates?.[0]?.finishReason === "SAFETY") {
        throw new AudioAnalysisError("The audio review was blocked by the model safety filter.", 422, "SAFETY_BLOCKED");
      }
      throw new AudioAnalysisError("The AI returned an empty response. Please try again.", 502, "EMPTY_AI_RESPONSE");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new AudioAnalysisError("The AI returned an invalid response format.", 502, "INVALID_AI_RESPONSE");
    }

    const result = parsed as Partial<AIAnalysisResult>;
    if (
      typeof result.riskScore !== "number" ||
      !Number.isFinite(result.riskScore) ||
      result.riskScore < 0 ||
      result.riskScore > 100 ||
      !["authentic", "suspicious", "deepfake"].includes(String(result.verdict)) ||
      typeof result.explanation !== "string" ||
      !Array.isArray(result.signals) ||
      result.signals.some((signal) => typeof signal !== "string")
    ) {
      throw new AudioAnalysisError("The AI returned incomplete analysis data.", 502, "INVALID_AI_RESPONSE");
    }

    return {
      riskScore: Math.round(result.riskScore),
      verdict: result.verdict as AIAnalysisResult["verdict"],
      explanation: result.explanation.slice(0, 4000),
      signals: result.signals.slice(0, 50).map((signal) => signal.slice(0, 160))
    };
  } catch (error: unknown) {
    if (error instanceof AudioAnalysisError) throw error;

    const message = error instanceof Error ? error.message : String(error);
    const status = (error as { status?: number; code?: number })?.status;
    if (status === 429 || message.toLowerCase().includes("quota") || message.includes("429")) {
      throw new AudioAnalysisError("Gemini rate limit reached. Please wait before trying again.", 429, "QUOTA_EXCEEDED");
    }
    if (status === 403 || message.includes("PERMISSION_DENIED")) {
      throw new AudioAnalysisError("Gemini rejected the server API key. Check its permissions and project.", 502, "PERMISSION_DENIED");
    }

    console.error("Gemini audio analysis failed:", message);
    throw new AudioAnalysisError("Audio analysis failed on the server. Please try again.", 502, "ANALYSIS_FAILED");
  }
}
