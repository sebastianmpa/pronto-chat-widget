// src/lib/api.ts
import type {
  SessionPayload,
  ChatRequest,
  ChatResponse,
  HistoryResponse,
  ConversationResponse,
  Customer,
} from "@/types";

export type ConversationRequest = {
  customerId: string;
  conversationId?: string; // ahora opcional
  question: string;
  session_id?: string | null;
  metadata?: Record<string, unknown>;
};

const API = {
  // existentes
  session: "/session",            // POST
  chat: "/chat",                  // POST
  chatStream: "/chat/stream",     // POST (SSE o text/event-stream)
  history: "/history",            // GET ?sessionId=..&cursor=..
  clear: "/history/clear",        // POST {sessionId}

  // NUEVOS
  customers: "/api/customers/v0",        // POST {email,name,lastName} → [customer, true]
  conversation: "/api/conversations/v0",  // POST {customerId, conversationId, question, session_id?} → {session_id, answer}
};

let BASE = ""; // se toma de data-endpoint (p.ej. http://localhost:4000)

export function setBase(url: string) {
  BASE = url.replace(/\/+$/, "");
}

/* ------------------------------ EXISTENTES ------------------------------ */

export async function createOrUpdateSession(p: SessionPayload) {
  const r = await fetch(BASE + API.session, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p)
  });
  if (!r.ok) throw new Error("session");
  return r.json();
}

export async function sendMessage(req: ChatRequest): Promise<ChatResponse> {
  const r = await fetch(BASE + API.chat, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req)
  });
  if (!r.ok) throw new Error("chat");
  return r.json();
}

/** Streaming via SSE (server must send lines "data: {json}\\n\\n") */
export async function* streamMessage(
  req: ChatRequest
): AsyncGenerator<string, void, unknown> {
  const r = await fetch(BASE + API.chatStream, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ ...req, stream: true })
  });
  if (!r.ok || !r.body) throw new Error("stream");

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const p of parts) {
      const line = p.trim().replace(/^data:\s?/, "");
      yield line; // token parcial o JSON por línea
    }
  }
}

export async function fetchHistory(
  sessionId: string,
  cursor?: string | null
): Promise<HistoryResponse> {
  const url = new URL(BASE + API.history, location.origin);
  url.searchParams.set("sessionId", sessionId);
  if (cursor) url.searchParams.set("cursor", cursor);
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error("history");
  return r.json();
}

export async function clearHistory(sessionId: string) {
  await fetch(BASE + API.clear, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId })
  });
}

/* -------------------------------- NUEVOS -------------------------------- */

export async function createCustomer(p: {
  name: string;
  lastName: string;
  email: string;
}): Promise<Customer> {
  const r = await fetch(BASE + API.customers, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p)
  });
  if (!r.ok) throw new Error("customers");
  const data = await r.json(); // [customer, true] según tu backend
  const customer: Customer = Array.isArray(data) ? data[0] : data;
  return customer;
}

export async function askQuestion(
  req: ConversationRequest
): Promise<ConversationResponse> {
  const payload = { ...req };
  if (payload.conversationId === undefined) {
    delete payload.conversationId;
  }
  const r = await fetch(BASE + API.conversation, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  console.log(payload);
  if (!r.ok) throw new Error("conversation");
  return r.json();
}
