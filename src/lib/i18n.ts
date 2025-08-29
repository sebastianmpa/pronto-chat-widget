import { lstat } from "fs";

export type Lang = "es" | "en";

const dict = {
  es: {
    open: "Chat",
    send: "Enviar",
    typing: "Escribiendo…",
    welcome: "¡Hola! Puedo ayudarte a identificar partes compatibles, descargar manuales y añadir productos al carrito.",
    name: "Nombre",
    email: "Correo",
    lastName: "Apellido",
    consent: "Acepto la política de privacidad",
    start: "Comenzar",
    invalidEmail: "Correo inválido",
    required: "Campo requerido",
    loadMore: "Cargar más",
    clear: "Borrar conversación",
    minimize: "Minimizar",
    close: "Cerrar",
    language: "Idioma"
  },
  en: {
    open: "Chat",
    send: "Send",
    typing: "Typing…",
    welcome: "Hi! I can help identify compatible parts, download manuals and add products to your cart.",
    name: "Name",
    email: "Email",
    lastName: "Last Name",
    consent: "I accept the privacy policy",
    start: "Start",
    invalidEmail: "Invalid email",
    required: "Required",
    loadMore: "Load more",
    clear: "Clear conversation",
    minimize: "Minimize",
    close: "Close",
    language: "Language"
  }
} as const;

export function detectLang(): Lang {
  const n = (navigator.language || "en").slice(0,2).toLowerCase();
  return n === "es" ? "es" : "en";
}
export function t(lang: Lang, key: keyof typeof dict["en"]) {
  return dict[lang][key];
}
