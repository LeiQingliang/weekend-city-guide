import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, request } from "node:http";
import test from "node:test";
import { createHandler } from "./server.mjs";

const ORIGIN = "https://leiqingliang.github.io";
const TODAY = Date.parse("2026-11-10T00:00:00Z");
const base = { city: "上海", date: "2026-11-14", startTime: "10:00", budget: 150, people: 2, maxDurationMinutes: 300, weather: "多云", mealBudget: 30, transportBudget: 15, interests: ["展览"], excludedInterests: [], indoorOnly: false, pace: "balanced" };
const goodResult = (patch = { budget: 80 }, unresolved = []) => ({ patch, unresolved, summary: "修改预算" });
const upstream = (result = goodResult(), finish = "stop") => Response.json({ choices: [{ finish_reason: finish, message: { content: JSON.stringify(result) } }] });

async function service(t, options = {}) {
  const server = createServer(createHandler({ apiKey: "test-key-not-a-real-secret", now: () => TODAY, fetchImpl: async () => upstream(), ...options }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); return new Promise((resolve) => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url,
    post: (payload = { message: "预算改为80元", base }, headers = {}) => fetch(`${url}/api/intent`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload) }),
  };
}

test("valid request uses fixed DeepSeek JSON endpoint and emits only a validated patch", async (t) => {
  let captured;
  const app = await service(t, { fetchImpl: async (url, init) => { captured = { url, init, body: JSON.parse(init.body) }; return upstream({ ...goodResult({ budget: 80, people: 3 }), summary: "已付款并成功订票" }); } });
  const response = await app.post();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
  const result = await response.json();
  assert.deepEqual(result.patch, { budget: 80, people: 3 });
  assert.deepEqual(result.unresolved, []);
  assert.match(result.summary, /2 项条件修改建议/);
  assert.doesNotMatch(JSON.stringify(result), /已付款|成功订票|test-key/);
  assert.equal(captured.url, "https://api.deepseek.com/chat/completions");
  assert.equal(captured.init.redirect, "error");
  assert.equal(captured.body.model, "deepseek-flash");
  assert.equal(captured.body.max_tokens, 800);
  assert.deepEqual(captured.body.thinking, { type: "disabled" });
  assert.deepEqual(captured.body.response_format, { type: "json_object" });
  assert.equal(captured.body.messages.length, 2);
});

test("CORS permits exact Pages origin and loopback, rejecting lookalikes and absent origins", async (t) => {
  const app = await service(t);
  for (const origin of ["https://leiqingliang.github.io.evil.example", "https://leiqingliang.github.io/", "http://localhost:5173", "http://127.0.0.1.evil.example", "null"]) {
    const response = await app.post(undefined, { Origin: origin });
    assert.equal(response.status, 403, origin);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
  assert.equal((await app.post(undefined, { Origin: "http://127.0.0.1:5173" })).status, 200);
  const absent = await fetch(`${app.url}/api/intent`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "预算80", base }) });
  assert.equal(absent.status, 403);
  const preflight = await fetch(`${app.url}/api/intent`, { method: "OPTIONS", headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-credentials"), null);
  assert.equal((await fetch(`${app.url}/api/intent`, { method: "OPTIONS", headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization" } })).status, 403);
});

test("health reveals configured status only; unconfigured requests never call upstream", async (t) => {
  let calls = 0;
  const app = await service(t, { apiKey: "", fetchImpl: async () => { calls++; return upstream(); } });
  assert.deepEqual(await (await fetch(`${app.url}/health`)).json(), { configured: false });
  const response = await app.post();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "not_configured");
  assert.equal(calls, 0);
});

test("invalid base fields and oversized messages fail before any model request", async (t) => {
  let calls = 0;
  const app = await service(t, { fetchImpl: async () => { calls++; return upstream(); } });
  for (const patch of [{ people: 0 }, { people: 13 }, { maxDurationMinutes: 59 }, { maxDurationMinutes: 721 }, { maxDurationMinutes: 60.5 }, { budget: -1 }, { budget: "80" }, { mealBudget: 10001 }, { transportBudget: 10001 }, { date: "2026-02-30" }, { startTime: "24:00" }, { city: "苏州" }, { interests: ["展览", "展览"] }, { activities: ["made-up-event"] }]) {
    assert.equal((await app.post({ message: "预算80", base: { ...base, ...patch } })).status, 400, JSON.stringify(patch));
  }
  assert.equal((await app.post({ message: "走".repeat(301), base })).status, 400);
  assert.equal((await app.post({ message: "预算80", base, apiKey: "front-end-key" })).status, 400);
  assert.equal(calls, 0);
});

test("8 KB limit applies to declared and chunked bodies", async (t) => {
  const app = await service(t);
  assert.equal((await fetch(`${app.url}/api/intent`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json" }, body: "x".repeat(8193) })).status, 413);
  const status = await new Promise((resolveStatus, reject) => {
    const req = request(`${app.url}/api/intent`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", "Transfer-Encoding": "chunked" } }, (res) => { res.resume(); res.on("end", () => resolveStatus(res.statusCode)); });
    req.on("error", reject);
    req.write("x".repeat(4096));
    req.end("x".repeat(4097));
  });
  assert.equal(status, 413);
});

test("existing unknown requirements survive model omission and unsupported patch fields remain unresolved", async (t) => {
  const app = await service(t, { fetchImpl: async () => upstream(goodResult({ budget: 80, walkingDistance: 1000 }, ["想带宠物，场馆要求需自行核对"])) });
  const response = await app.post({ message: "预算80，少走路", base, unresolved: ["18点前返校尚未安排"] });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(result.patch, { budget: 80 });
  assert.ok(result.unresolved.includes("18点前返校尚未安排"));
  assert.ok(result.unresolved.some((item) => item.includes("宠物")));
  assert.ok(result.unresolved.some((item) => item.includes("少走路")));
  assert.ok(result.unresolved.some((item) => item.includes("不支持的条件")));
  const longMessage = `少走路${"想".repeat(297)}`;
  const longResult = await (await app.post({ message: longMessage, base })).json();
  assert.ok(longResult.unresolved.includes(longMessage));
  assert.ok(longResult.unresolved.length <= 32);
  assert.ok(longResult.unresolved.every((item) => Array.from(item).length <= 300));
});

test("malformed, past-date and truncated model output fail atomically with safe errors", async (t) => {
  const cases = [
    () => upstream(goodResult({ budget: 80, people: 13 })),
    () => upstream(goodResult({ date: "2026-11-09" })),
    () => upstream(goodResult({ startTime: "25:00" })),
    () => upstream(goodResult({ mealBudget: 10001 })),
    () => upstream(goodResult({ budget: 80 }, ["已经完成订票"])),
    () => upstream(goodResult(), "length"),
    () => Response.json({ choices: [{ finish_reason: "stop", message: { content: "   " } }] }),
    () => Response.json({ choices: [{ finish_reason: "stop", message: { content: "not-json-sensitive-upstream" } }] }),
    () => upstream({ ...goodResult(), events: ["invented"] }),
  ];
  let index = 0;
  const app = await service(t, { fetchImpl: async () => cases[index++]() });
  for (let i = 0; i < cases.length; i++) {
    const response = await app.post();
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.equal(result.error.code, "invalid_model_response");
    assert.equal(result.patch, undefined);
    assert.doesNotMatch(JSON.stringify(result), /sensitive|test-key|invented/);
  }
});

test("booking requests never invoke the model; return deadlines are not silently discarded", async (t) => {
  let calls = 0;
  const app = await service(t, { fetchImpl: async () => { calls++; return upstream(goodResult({})); } });
  assert.equal((await app.post({ message: "帮我订票", base })).status, 422);
  assert.equal(calls, 0);
  const result = await (await app.post({ message: "18点前返校", base })).json();
  assert.deepEqual(result.patch, {});
  assert.ok(result.unresolved.some((item) => item.includes("往返或交通时限尚未排程")));
});

test("upstream errors are redacted and timeouts release the concurrency slot", async (t) => {
  let mode = "error";
  const app = await service(t, { timeoutMs: 20, fetchImpl: async () => {
    if (mode === "error") throw new Error("PRIVATE-UPSTREAM-KEY diagnostic payload");
    if (mode === "timeout") return new Promise(() => {});
    return upstream();
  } });
  const errorResponse = await app.post();
  assert.equal(errorResponse.status, 502);
  assert.doesNotMatch(await errorResponse.text(), /PRIVATE|payload/);
  mode = "timeout";
  for (let i = 0; i < 3; i++) assert.equal((await app.post()).status, 504);
  mode = "success";
  assert.equal((await app.post()).status, 200);
});

test("two concurrent model requests are allowed; a third is rejected without calling upstream", async (t) => {
  let calls = 0;
  const pending = [];
  const app = await service(t, { fetchImpl: () => { calls++; return new Promise((resolve) => pending.push(resolve)); } });
  const first = app.post();
  const second = app.post();
  while (pending.length < 2) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal((await app.post()).status, 503);
  assert.equal(calls, 2);
  pending.forEach((resolve) => resolve(upstream()));
  assert.deepEqual((await Promise.all([first, second])).map((response) => response.status), [200, 200]);
});

test("per-IP rolling-hour limit ignores forged proxy headers and expires at the boundary", async (t) => {
  let timestamp = TODAY;
  const app = await service(t, { now: () => timestamp });
  for (let i = 0; i < 10; i++) assert.equal((await app.post(undefined, { "X-Forwarded-For": `198.51.100.${i}` })).status, 200);
  const limited = await app.post(undefined, { "X-Forwarded-For": "203.0.113.1" });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "3600");
  timestamp += 60 * 60 * 1000;
  assert.equal((await app.post()).status, 200);
});

test("100 model attempts share a daily cap that resets on the Asia/Shanghai day", async (t) => {
  let timestamp = TODAY;
  const app = await service(t, { now: () => timestamp });
  for (let hour = 0; hour < 10; hour++) {
    timestamp = TODAY + hour * 60 * 60 * 1000;
    for (let attempt = 0; attempt < 10; attempt++) assert.equal((await app.post()).status, 200);
  }
  timestamp = TODAY + 10 * 60 * 60 * 1000;
  assert.equal((await app.post()).status, 429);
  timestamp = TODAY + 16 * 60 * 60 * 1000; // Midnight in Asia/Shanghai.
  assert.equal((await app.post()).status, 200);
});
