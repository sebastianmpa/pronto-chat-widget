// src/lib/storage.ts
const KEY = "pronto-chat:v1";

export type Persisted = {
  sessionId: string;
  name?: string;
  lastName?: string;          // <- nuevo
  email?: string;
  consent?: boolean;
  locale?: "es" | "en";
  prontoCustomerId?: string;  // <- opcional guardado
  conversationId?: string;    // <- opcional guardado
  ragSessionId?: string;      // <- opcional guardado
};

type PersistedPartial = Partial<Persisted>;

export const storage = {
  read(): PersistedPartial {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as PersistedPartial) : {};
    } catch {
      return {};
    }
  },
  write(v: PersistedPartial) {
    const curr = storage.read();
    localStorage.setItem(KEY, JSON.stringify({ ...curr, ...v }));
  },
  clear() {
    localStorage.removeItem(KEY);
  },
};

export function ensureSessionId(): string {
  const s = storage.read();
  if (s.sessionId && typeof s.sessionId === "string") return s.sessionId;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  storage.write({ ...s, sessionId: id });
  return id;
}

// Claves explícitas para otros scripts
const KEY_CUSTOMER = "pronto_rag_chat_customer_id";
const KEY_CONV     = "pronto_rag_chat_conversation_id";
const KEY_SESSION  = "pronto_rag_chat_session_id";

// CustomerId
export function setCustomerId(id: string) {
  localStorage.setItem(KEY_CUSTOMER, id);
  storage.write({ prontoCustomerId: id });
}
export function getCustomerId(): string | null {
  const s = storage.read();
  return localStorage.getItem(KEY_CUSTOMER) || s.prontoCustomerId || null;
}

// ConversationId
export function setConversationId(id: string) {
  localStorage.setItem(KEY_CONV, id);
  storage.write({ conversationId: id });
}
export function getConversationId(): string | null {
  const s = storage.read();
  return localStorage.getItem(KEY_CONV) || s.conversationId || null;
}

// RAG session_id
export function setRagSessionId(id: string) {
  localStorage.setItem(KEY_SESSION, id);
  storage.write({ ragSessionId: id });
}
export function getRagSessionId(): string | null {
  const s = storage.read();
  return localStorage.getItem(KEY_SESSION) || s.ragSessionId || null;
}
