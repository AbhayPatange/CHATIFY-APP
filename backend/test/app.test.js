import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.MONGO_URI = "mongodb://127.0.0.1:1/none";
process.env.NODE_ENV = "test";

const { createApp } = await import("../src/app.js");
const { createRateLimiter } = await import("../src/middleware/rateLimit.middleware.js");
const express = (await import("express")).default;

let server, base;
before(async () => {
  server = http.createServer(createApp());
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, body, headers = {}) =>
  fetch(base + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("health reports degraded when DB is down", async () => {
  const res = await fetch(base + "/api/health");
  assert.equal(res.status, 503);
  assert.equal((await res.json()).db, "down");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("unknown api route -> JSON 404", async () => {
  const res = await fetch(base + "/api/nope");
  assert.equal(res.status, 404);
});

test("protected routes need auth, bad token is 401 not 500", async () => {
  assert.equal((await fetch(base + "/api/auth/check")).status, 401);
  const res = await fetch(base + "/api/messages/contacts", { headers: { cookie: "jwt=garbage" } });
  assert.equal(res.status, 401);
});

test("login rejects NoSQL-injection style payloads", async () => {
  const res = await post("/api/auth/login", { email: { $gt: "" }, password: { $gt: "" } });
  assert.equal(res.status, 400);
});

test("signup validates input before touching the DB", async () => {
  const res = await post("/api/auth/signup", { fullName: "Al", email: "bad", password: "123456" });
  assert.equal(res.status, 400);
});

test("malformed JSON -> 400, oversized body -> 413", async () => {
  assert.equal((await post("/api/auth/login", "{oops")).status, 400);
  const res = await post("/api/auth/login", { email: "a@b.co", password: "x".repeat(200_000) });
  assert.equal(res.status, 413);
});

test("rate limiter blocks after max and sets Retry-After", async () => {
  const app = express();
  app.use(createRateLimiter({ windowMs: 60_000, max: 2 }));
  app.get("/", (_q, r) => r.send("ok"));
  const s = http.createServer(app);
  await new Promise((r) => s.listen(0, r));
  const url = `http://127.0.0.1:${s.address().port}/`;
  assert.equal((await fetch(url)).status, 200);
  assert.equal((await fetch(url)).status, 200);
  const blocked = await fetch(url);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get("retry-after"));
  s.close();
});
