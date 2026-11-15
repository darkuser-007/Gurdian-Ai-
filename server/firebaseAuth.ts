import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const firebaseConfig = require("../firebase-applet-config.json") as {
  apiKey: string;
  projectId: string;
};

export class FirebaseAuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "FirebaseAuthError";
  }
}

export interface VerifiedFirebaseUser {
  uid: string;
}

interface FirebaseAccountInfo {
  users?: Array<{
    localId?: string;
    disabled?: boolean;
    validSince?: string;
  }>;
}

interface FirebaseTokenClaims {
  aud?: string;
  iss?: string;
  sub?: string;
  exp?: number;
  iat?: number;
}

function decodeTokenClaims(idToken: string): FirebaseTokenClaims {
  const parts = idToken.split(".");
  if (parts.length !== 3 || parts[1].length === 0) {
    throw new FirebaseAuthError("A valid Firebase sign-in token is required.", 401, "INVALID_TOKEN");
  }

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as FirebaseTokenClaims;
  } catch {
    throw new FirebaseAuthError("A valid Firebase sign-in token is required.", 401, "INVALID_TOKEN");
  }
}

/**
 * Verify the caller's Firebase ID token with Firebase Authentication.
 * Decoded JWT claims are only used for consistency checks; account validity
 * is established by the Firebase accounts:lookup endpoint.
 */
export async function verifyFirebaseIdToken(
  authorizationHeader: string | undefined,
  fetcher: typeof fetch = fetch
): Promise<VerifiedFirebaseUser> {
  const match = authorizationHeader?.match(/^Bearer\s+([^\s]+)$/i);
  const idToken = match?.[1];

  if (!idToken || idToken.length > 8192) {
    throw new FirebaseAuthError("Sign in with Google before running an audio review.", 401, "SIGN_IN_REQUIRED");
  }

  const claims = decodeTokenClaims(idToken);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    claims.aud !== firebaseConfig.projectId ||
    claims.iss !== "https://securetoken.google.com/" + firebaseConfig.projectId ||
    typeof claims.sub !== "string" ||
    claims.sub.length === 0 ||
    claims.sub.length > 128 ||
    typeof claims.iat !== "number" ||
    claims.iat < 0 ||
    claims.iat > nowSeconds + 60 ||
    typeof claims.exp !== "number" ||
    claims.exp <= nowSeconds ||
    claims.exp <= claims.iat
  ) {
    throw new FirebaseAuthError("Your sign-in token is invalid or expired. Sign in again.", 401, "INVALID_TOKEN");
  }

  const apiKey = process.env.FIREBASE_WEB_API_KEY || firebaseConfig.apiKey;
  if (!apiKey) {
    throw new FirebaseAuthError("Firebase Authentication is not configured on the server.", 503, "AUTH_NOT_CONFIGURED");
  }

  let response: Response;
  try {
    response = await fetcher(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(8000)
      }
    );
  } catch {
    throw new FirebaseAuthError("Firebase Authentication could not be reached. Please retry.", 503, "AUTH_UNAVAILABLE");
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new FirebaseAuthError("Your sign-in has expired or is no longer valid. Sign in again.", 401, "INVALID_TOKEN");
    }
    throw new FirebaseAuthError("Firebase Authentication is temporarily unavailable.", 503, "AUTH_UNAVAILABLE");
  }

  let account: FirebaseAccountInfo;
  try {
    account = await response.json() as FirebaseAccountInfo;
  } catch {
    throw new FirebaseAuthError("Firebase Authentication returned an invalid response.", 503, "AUTH_UNAVAILABLE");
  }

  const user = account.users?.[0];
  if (!user?.localId || user.localId !== claims.sub) {
    throw new FirebaseAuthError("Your sign-in token does not match this Firebase project.", 401, "INVALID_TOKEN");
  }

  if (user.disabled) {
    throw new FirebaseAuthError("This Firebase account is disabled.", 403, "USER_DISABLED");
  }

  const validSince = Number(user.validSince || 0);
  if (Number.isFinite(validSince) && validSince > 0 && claims.iat < validSince) {
    throw new FirebaseAuthError("Your sign-in token has been revoked. Sign in again.", 401, "TOKEN_REVOKED");
  }

  return { uid: user.localId };
}
