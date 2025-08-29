/* =========================================================
 * Pronto Chat – Tipos centrales
 * =======================================================*/

export type Locale = "es" | "en";

/** ID aliases (claridad semántica) */
export type SessionId = string;       // id interno del widget
export type CustomerId = string;      // id del cliente (backend)
export type ConversationId = string;  // id de conversación (widget/backend)
export type RagSessionId = string;    // session_id de la API RAG

/* ---------- Onboarding / Session ---------- */

export type SessionPayload = {
  name: string;
  lastName: string;
  email: string;
  consent: boolean;
  locale: Locale;
  sessionId: SessionId; // seguimos enviando este id interno si tu backend lo usa
};

/* ---------- Customer ---------- */

export type Customer = {
  id: CustomerId;
  name: string;
  lastName: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

/** Algunos backends devuelven [customer, true] */
export type CreateCustomerResponseRaw = [Customer, boolean] | Customer;

/* ---------- Conversación (nuevo flujo RAG) ---------- */

export type ConversationRequest = {
  customerId: CustomerId;
  conversationId: ConversationId;    // lo generamos en el widget si no existe
  question: string;
  session_id?: RagSessionId | null;  // si ya tienes el session_id guardado
  metadata?: Record<string, unknown>; // opcional: página, idioma, etc.
};

export type ConversationResponse = {
  session_id: RagSessionId;
  answer: string;
  /** opcional: tu backend puede adjuntar acciones en cada respuesta */
  actions?: ChatAction[];
};

/* ---------- Acciones por mensaje ---------- */

export type ChatAction =
  | { type: "add_to_cart"; label: string; cartUrl: string }
  | { type: "download_pdf"; label: string; pdfUrl: string }
  | { type: "details"; label: string; url: string };

/* ---------- Mensajería/UI ---------- */

export type ChatMessage = {
  id: string;
  who: "user" | "assistant" | "system"; // mantenemos 'who' para no romper el UI
  text?: string;                         // markdown seguro
  actions?: ChatAction[];
  createdAt?: string;                    // ISO string
};

export type HistoryResponse = {
  messages: ChatMessage[];
  cursor?: string | null;
};

/* ---------- Compat (endpoints antiguos /chat y /chat/stream) ---------- */

export type ChatRequest = {
  sessionId: SessionId;
  message: string;
  locale?: Locale;
  metadata?: Record<string, unknown>;
  stream?: boolean;
};

export type ChatResponse = {
  message: ChatMessage;
  cursor?: string | null;
};
