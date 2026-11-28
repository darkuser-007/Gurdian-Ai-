import { test } from "node:test";
import { strict as assert } from "node:assert";
import { FirebaseAuthError, verifyFirebaseIdToken } from "../server/firebaseAuth";

function makeIdToken(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = {
    aud: "guardian-ai-db",
    iss: "https://securetoken.google.com/guardian-ai-db",
    sub: "guardian-test-user",
    iat: now,
    exp: now + 3600,
    ...overrides
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return header + "." + payload + ".test-signature";
}

function mockFirebaseLookup(user: Record<string, unknown>, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify({ users: [user] }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("rejects requests without a bearer token before contacting Firebase", async () => {
  await assert.rejects(
    () => verifyFirebaseIdToken(undefined, async () => {
      throw new Error("fetch should not be called");
    }),
    (error: unknown) => error instanceof FirebaseAuthError && error.code === "SIGN_IN_REQUIRED"
  );
});

test("rejects malformed and wrong-project tokens", async () => {
  await assert.rejects(
    () => verifyFirebaseIdToken("Bearer not-a-jwt", async () => new Response("{}")),
    (error: unknown) => error instanceof FirebaseAuthError && error.statusCode === 401
  );

  const wrongProject = makeIdToken({ aud: "another-project" });
  await assert.rejects(
    () => verifyFirebaseIdToken("Bearer " + wrongProject, async () => new Response("{}")),
    (error: unknown) => error instanceof FirebaseAuthError && error.code === "INVALID_TOKEN"
  );
});

test("accepts an active user returned by Firebase accounts:lookup", async () => {
  const token = makeIdToken();
  const user = await verifyFirebaseIdToken(
    "Bearer " + token,
    mockFirebaseLookup({ localId: "guardian-test-user", disabled: false, validSince: "0" })
  );
  assert.equal(user.uid, "guardian-test-user");
});

test("rejects disabled accounts", async () => {
  const token = makeIdToken();
  await assert.rejects(
    () => verifyFirebaseIdToken("Bearer " + token, mockFirebaseLookup({
      localId: "guardian-test-user",
      disabled: true,
      validSince: "0"
    })),
    (error: unknown) => error instanceof FirebaseAuthError && error.code === "USER_DISABLED"
  );
});

test("rejects ID tokens issued before the account revocation time", async () => {
  const issuedAt = Math.floor(Date.now() / 1000) - 3600;
  const token = makeIdToken({ iat: issuedAt });
  await assert.rejects(
    () => verifyFirebaseIdToken("Bearer " + token, mockFirebaseLookup({
      localId: "guardian-test-user",
      disabled: false,
      validSince: String(issuedAt + 60)
    })),
    (error: unknown) => error instanceof FirebaseAuthError && error.code === "TOKEN_REVOKED"
  );
});

test("maps Firebase service failures to a retryable server error", async () => {
  const token = makeIdToken();
  await assert.rejects(
    () => verifyFirebaseIdToken("Bearer " + token, async () => new Response("{}", { status: 503 })),
    (error: unknown) => error instanceof FirebaseAuthError && error.statusCode === 503
  );
});


test("rejects an ID token issued too far in the future", async () => {
  const token = makeIdToken({ iat: Math.floor(Date.now() / 1000) + 120 });
  await assert.rejects(
    () => verifyFirebaseIdToken("Bearer " + token, async () => {
      throw new Error("Firebase must not be contacted for invalid claims");
    }),
    (error: unknown) => error instanceof FirebaseAuthError && error.code === "INVALID_TOKEN"
  );
});

test("rejects an expired ID token before contacting Firebase", async () => {
  const now = Math.floor(Date.now() / 1000);
  const token = makeIdToken({ iat: now - 120, exp: now - 1 });
  await assert.rejects(
    () => verifyFirebaseIdToken("Bearer " + token, async () => {
      throw new Error("Firebase must not be contacted for expired claims");
    }),
    (error: unknown) => error instanceof FirebaseAuthError && error.code === "INVALID_TOKEN"
  );
});
