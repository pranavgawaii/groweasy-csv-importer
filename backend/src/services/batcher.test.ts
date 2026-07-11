import assert from "node:assert/strict";
import { test } from "node:test";
import { chunk, mapWithConcurrency, withRetry } from "./batcher.js";

test("chunk splits into fixed-size batches", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
});

test("withRetry succeeds after transient failures", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("transient");
      return "ok";
    },
    2,
    1
  );
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("withRetry throws after exhausting retries", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw new Error("always fails");
      },
      2,
      1
    )
  );
  assert.equal(calls, 3); // 1 initial + 2 retries
});

test("mapWithConcurrency preserves order and caps concurrency", async () => {
  const items = [10, 20, 30, 40, 50];
  let active = 0;
  let maxActive = 0;

  const results = await mapWithConcurrency(items, 2, async (n) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, 5));
    active -= 1;
    return n * 2;
  });

  assert.deepEqual(results, [20, 40, 60, 80, 100]);
  assert.ok(maxActive <= 2, `expected <=2 concurrent, saw ${maxActive}`);
});
