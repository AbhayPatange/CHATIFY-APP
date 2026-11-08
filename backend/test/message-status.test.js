import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.MONGO_URI = "mongodb://127.0.0.1:1/none";
process.env.NODE_ENV = "test";

const { createApp } = await import("../src/app.js");
const { default: Message, MESSAGE_STATUS } = await import("../src/models/Message.js");

let server, base;
before(async () => {
  server = http.createServer(createApp());
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const ids = () => ({ senderId: new mongoose.Types.ObjectId(), receiverId: new mongoose.Types.ObjectId() });

test("a new message starts as 'sent' (one tick)", () => {
  const msg = new Message({ ...ids(), text: "hi" });
  assert.equal(msg.status, MESSAGE_STATUS.SENT);
  assert.equal(msg.validateSync(), undefined);
});

test("status can only be sent, delivered or seen", () => {
  for (const status of ["sent", "delivered", "seen"]) {
    assert.equal(new Message({ ...ids(), text: "hi", status }).validateSync(), undefined);
  }
  const bad = new Message({ ...ids(), text: "hi", status: "read-by-aliens" });
  assert.ok(bad.validateSync()?.errors.status);
});

test("marking a chat as seen requires login", async () => {
  const res = await fetch(`${base}/api/messages/seen/${new mongoose.Types.ObjectId()}`, { method: "PUT" });
  assert.equal(res.status, 401);
});
