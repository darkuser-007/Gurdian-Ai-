import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createInMemoryRateLimiter } from "../server/rateLimit";

test("allows requests up to the configured limit and returns retry guidance", () => {
  let now = 1_000;
  const limiter = createInMemoryRateLimiter({ windowMs: 10_000, maxRequests: 2, now: () => now });
  assert.deepEqual(limiter.consume("user-1"), { allowed: true, remaining: 1, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.consume("user-1"), { allowed: true, remaining: 0, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.consume("user-1"), { allowed: false, remaining: 0, retryAfterSeconds: 10 });
  now += 2_500;
  assert.equal(limiter.consume("user-1").retryAfterSeconds, 8);
});

test("resets a user's counter after the fixed window expires", () => {
  let now = 100;
  const limiter = createInMemoryRateLimiter({ windowMs: 1_000, maxRequests: 1, now: () => now });
  assert.equal(limiter.consume("user-1").allowed, true);
  assert.equal(limiter.consume("user-1").allowed, false);
  now = 1_100;
  assert.equal(limiter.consume("user-1").allowed, true);
});

test("bounds its in-memory key table when many distinct users arrive", () => {
  const limiter = createInMemoryRateLimiter({ windowMs: 60_000, maxRequests: 1, maxEntries: 2, now: () => 1_000 });
  assert.equal(limiter.consume("user-1").allowed, true);
  assert.equal(limiter.consume("user-2").allowed, true);
  assert.equal(limiter.consume("user-3").allowed, true);
  // The table stays bounded by evicting its oldest key under capacity pressure.
  assert.equal(limiter.consume("user-1").allowed, true);
});

test("rejects empty keys and invalid limiter settings", () => {
  const limiter = createInMemoryRateLimiter();
  assert.throws(() => limiter.consume(""), /non-empty/);
  assert.throws(() => createInMemoryRateLimiter({ maxRequests: 0 }), /maxRequests/);
  assert.throws(() => createInMemoryRateLimiter({ maxEntries: 0 }), /maxEntries/);
});
