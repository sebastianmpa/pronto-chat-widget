import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: ["http://localhost:5173","http://127.0.0.1:5173", "http://10.1.10.53:5500","http://localhost:5500", "http://127.0.0.1:5500" ], credentials: true }));
app.use(express.json());

function uuid() {
  return (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function")
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

const memory = { customers: new Map(), conversations: new Map() };

app.post("/api/customers/v0", (req, res) => {
  const { email, name, lastName } = req.body || {};
  if (!email || !name || !lastName) return res.status(400).json({ error: "Missing fields" });
  const now = new Date().toISOString();
  let c = memory.customers.get(email);
  if (!c) {
    c = { id: uuid(), name, lastName, email, createdAt: now, updatedAt: now, deletedAt: null };
    memory.customers.set(email, c);
  } else {
    c.name = name; c.lastName = lastName; c.updatedAt = now;
  }
  res.json([c, true]);
});

app.post("/api/conversations/v0", (req, res) => {
  const { customerId, conversationId, question, session_id } = req.body || {};
  if (!customerId || !conversationId || !question) return res.status(400).json({ error: "Missing fields" });
  let conv = memory.conversations.get(conversationId);
  if (!conv) {
    conv = { customerId, session_id: session_id || uuid(), messages: [] };
    memory.conversations.set(conversationId, conv);
  }
  conv.messages.push({ who: "user", text: question, at: Date.now() });
  const answer = `Echo RAG: ${question}`;
  conv.messages.push({ who: "assistant", text: answer, at: Date.now() });
  res.json({ session_id: conv.session_id, answer });
});

app.listen(4000, () => console.log("Mock API on http://localhost:4000"));
