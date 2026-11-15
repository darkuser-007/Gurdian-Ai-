export interface AIAnalysisResult {
  riskScore: number;
  verdict: "authentic" | "suspicious" | "deepfake";
  explanation: string;
  signals: string[];
}

/**
 * Sends an uploaded audio sample to Guardian's server-side analysis endpoint.
 * The Gemini API key never enters the browser bundle.
 */
export async function analyzeAudioForDeepfake(
  fileBase64: string,
  mimeType: string
): Promise<AIAnalysisResult> {
  const response = await fetch("/api/analyze-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64: fileBase64, mimeType })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Audio analysis failed (HTTP " + response.status + ").");
  }

  if (
    typeof payload?.riskScore !== "number" ||
    !["authentic", "suspicious", "deepfake"].includes(payload?.verdict) ||
    typeof payload?.explanation !== "string" ||
    !Array.isArray(payload?.signals)
  ) {
    throw new Error("The analysis service returned an invalid response.");
  }

  return payload as AIAnalysisResult;
}
