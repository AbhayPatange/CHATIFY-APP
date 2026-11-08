import test from "node:test";
import assert from "node:assert/strict";
import { validateImageDataUrl, validateSignupInput, isObjectId, normalizeEmail } from "../src/lib/validators.js";
import { parseCookies } from "../src/lib/utils.js";

test("signup validation", () => {
  const ok = { fullName: "Jane Doe", email: "Jane@Example.com", password: "secret1" };
  assert.equal(validateSignupInput(ok), null);
  assert.ok(validateSignupInput({ ...ok, email: { $gt: "" } }), "object email rejected");
  assert.ok(validateSignupInput({ ...ok, email: "nope" }));
  assert.ok(validateSignupInput({ ...ok, password: "123" }));
  assert.ok(validateSignupInput({ ...ok, password: "x".repeat(73) }));
  assert.ok(validateSignupInput({ ...ok, fullName: "A" }));
});

test("normalizeEmail / isObjectId", () => {
  assert.equal(normalizeEmail("  A@B.com "), "a@b.com");
  assert.equal(normalizeEmail({ $gt: "" }), "");
  assert.equal(isObjectId("507f1f77bcf86cd799439011"), true);
  assert.equal(isObjectId("123"), false);
  assert.equal(isObjectId({ $ne: 1 }), false);
});

test("image data url validation", () => {
  assert.equal(validateImageDataUrl("data:image/png;base64,iVBORw0KGgo=").ok, true);
  assert.equal(validateImageDataUrl("data:text/html;base64,PGh0bWw+").ok, false);
  assert.equal(validateImageDataUrl("https://evil.com/x.png").ok, false);
  const big = "data:image/png;base64," + "A".repeat(5 * 1024 * 1024);
  assert.equal(validateImageDataUrl(big).ok, false);
});

test("cookie parsing", () => {
  assert.deepEqual(parseCookies("a=1; jwt=abc.def.ghi; b=x%20y"), { a: "1", jwt: "abc.def.ghi", b: "x y" });
  assert.deepEqual(parseCookies(undefined), {});
});
