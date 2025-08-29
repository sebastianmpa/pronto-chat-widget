type EventName =
  | "chat_open" | "chat_close" | "chat_minimize"
  | "message_sent" | "message_received"
  | "add_to_cart_success" | "add_to_cart_error"
  | "pdf_download_click";

export function track(event: EventName, payload: Record<string, unknown> = {}) {
  // GTM compatible
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({ event, ...payload, ts: Date.now() });
  // fallback
  if (process.env.NODE_ENV !== "production") console.debug("[analytics]", event, payload);
}
