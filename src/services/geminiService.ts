import { auth } from "../lib/firebase";

export interface AIAnalysisResult {
  riskScore: number;
  verdict: "authentic" | "suspicious" | "deepfake";
  explanation: string;
  signals: string[];
}

/**
 * Sends an uploaded audio sample to the authenticated server-side review API.
 * Firebase credentials and the Gemini API key are never sent to the model.
 */
export async function analyzeAudioForDeepfake(
  fileBase64: string,
  mimeType: string
): Promise<AIAnalysisResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("SIGN_IN_REQUIRED: Sign in with Google before reviewing audio.");
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch("/api/analyze-audio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + idToken
    },
    body: JSON.stringify({ audioBase64: fileBase64, mimeType })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("SIGN_IN_REQUIRED: Your sign-in expired. Sign in again to review this sample.");
    }
    throw new Error(payload?.error || "Audio review failed (HTTP " + response.status + ").");
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
