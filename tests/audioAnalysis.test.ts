import { test } from "node:test";
import { strict as assert } from "node:assert";
import { AudioAnalysisError, validateAudioInput } from "../server/audioAnalysis";

test("accepts a valid WebM recording and normalizes codec parameters", () => {
  const encoded = Buffer.from("guardian audio sample").toString("base64");
  const result = validateAudioInput(encoded, "audio/webm;codecs=opus");
  assert.equal(result.audioBase64, encoded);
  assert.equal(result.mimeType, "audio/webm");
});

test("rejects malformed base64 before forwarding it to Gemini", () => {
  assert.throws(
    () => validateAudioInput("not-valid-base64!", "audio/webm"),
    (error: unknown) => error instanceof AudioAnalysisError && error.code === "INVALID_AUDIO"
  );
});

test("rejects unsupported MIME types", () => {
  assert.throws(
    () => validateAudioInput(Buffer.from("sample").toString("base64"), "application/octet-stream"),
    (error: unknown) => error instanceof AudioAnalysisError && error.statusCode === 415
  );
});

test("rejects audio larger than 3 MB", () => {
  const oversizedAudio = Buffer.alloc(3 * 1024 * 1024 + 1).toString("base64");
  assert.throws(
    () => validateAudioInput(oversizedAudio, "audio/webm"),
    (error: unknown) => error instanceof AudioAnalysisError && error.statusCode === 413
  );
});
