import React, { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import cn from "classnames";
import { t, detectLang, type Lang } from "@/lib/i18n";
import {
  storage,
  ensureSessionId,
  setCustomerId,
  getCustomerId,
  setConversationId,
  getConversationId,
  setRagSessionId,
  getRagSessionId,
} from "@/lib/storage";
import { track } from "@/lib/analytics";
import { createCustomer, askQuestion, findCustomerById } from "@/lib/api";
import type { ChatMessage } from "@/types";
import Toasts, { pushToast } from "./Toast";
import robotIcon from "@/assets/imagen2.png";

type Props = {
  endpoint: string;
  title: string;
  primary: string;
  bg: string;
  bubbleRadius: number;
  token?: string | null;
  logoUrl?: string | null;
  enableDrag?: boolean;
  termsUrl?: string | null;
  hideFab?: boolean;
};

function PaperPlaneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 21l20-9L2 3v6l14 3L2 15v6z" fill="currentColor" />
    </svg>
  );
}

function useDrag(enabled: boolean, open: boolean) {
  useEffect(() => {
    if (!enabled || !open) return;
    const panelEl = document.getElementById("pc-panel") as HTMLDivElement | null;
    const headerEl = document.getElementById("pc-header") as HTMLDivElement | null;
    if (!panelEl || !headerEl) return;
    let sx = 0, sy = 0, x = panelEl.offsetLeft, y = panelEl.offsetTop, dragging = false;
    const md = (e: MouseEvent) => { dragging = true; sx = e.clientX; sy = e.clientY; e.preventDefault(); };
    const mm = (e: MouseEvent) => {
      if (!dragging) return;
      x += e.clientX - sx; y += e.clientY - sy; sx = e.clientX; sy = e.clientY;
      panelEl.style.right = "auto";
      panelEl.style.bottom = "auto";
      panelEl.style.left = `${Math.max(8, x)}px`;
      panelEl.style.top = `${Math.max(8, y)}px`;
    };
    const mu = () => { dragging = false; };
    headerEl.addEventListener("mousedown", md);
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    return () => {
      headerEl.removeEventListener("mousedown", md);
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup", mu);
    };
  }, [enabled, open]);
}

export default function ChatWidget(props: Props) {
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--pc-primary", props.primary);
    r.style.setProperty("--pc-bg", props.bg);
    r.style.setProperty("--pc-radius", `${props.bubbleRadius}px`);
  }, [props.primary, props.bg, props.bubbleRadius]);

  const initial = storage.read();
  const [profile, setProfile] = useState(initial);
  const lang: Lang = (initial.locale as Lang) || detectLang();

  const fabRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false); // Siempre inicia cerrado
  const [minimized, setMinimized] = useState(false);
  const [animClass, setAnimClass] = useState<string>("");
  
   // Controlar la apertura del chat para el botón personalizado
   useEffect(() => {
     if (!props.hideFab) return; // Solo si hideFab está activo

     const handleToggleChat = () => {
       setOpen(prev => !prev);
       setMinimized(false);
       if (!open) {
         track("chat_open");
       } else {
         track("chat_close");
       }
     };

     // Escuchar el evento global
     document.addEventListener('toggle-pronto-chat', handleToggleChat);
     return () => document.removeEventListener('toggle-pronto-chat', handleToggleChat);
   }, [props.hideFab, open]);  const sessionId = useMemo(() => ensureSessionId(), []);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  
  // Estados para la validación del customer
  const [customerExists, setCustomerExists] = useState<boolean | null>(null); // null = checking, true = exists, false = not exists
  const [validatingCustomer, setValidatingCustomer] = useState(false);

  // Solo mostrar onboarding si el customer no existe o está en validación
  const hasOnboarding = customerExists === false || customerExists === null;

  function scrollBottom(smooth = true) {
    if (msgsRef.current) {
      msgsRef.current.scrollTo({
        top: msgsRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }

  useDrag(!!props.enableDrag, open);

  // Animación al abrir/minimizar
  useEffect(() => {
    // Solo animar si realmente cambia de cerrado a abierto o viceversa
    if (open && !minimized) {
      setAnimClass("pc-opening");
      const timeout = setTimeout(() => setAnimClass(""), 380);
      return () => clearTimeout(timeout);
    } else if (!open && minimized === false && animClass !== "pc-minimizing") {
      setAnimClass("pc-minimizing");
      const timeout = setTimeout(() => setAnimClass("pc-hidden"), 380);
      return () => clearTimeout(timeout);
    }
  }, [open, minimized]);

  useEffect(() => {
    if (!open) return;
    if (msgs.length === 0) {
      const stored = storage.read();
      const welcome: ChatMessage = { 
        id: crypto.randomUUID(), 
        who: "assistant", 
        text: t(lang, "welcome", { name: stored.name })
      };
      setMsgs([welcome]);
    }
    scrollBottom(false); // Scroll instantáneo al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Efecto para manejar el scroll automático cuando hay nuevos mensajes
  useEffect(() => {
    if (msgs.length > 0) {
      scrollBottom();
    }
  }, [msgs.length]);

  // Exponer función global para abrir el chat cuando no está oculto el FAB
  useEffect(() => {
    if (props.hideFab) return; // Skip si hideFab está activo (ya manejado por el otro efecto)
    
    (window as any).openProntoChat = () => {
      if (fabRef.current) {
        fabRef.current.click();
      }
    };
    return () => {
      delete (window as any).openProntoChat;
    };
  }, [props.hideFab]);

  // Validar customer al cargar el componente
  useEffect(() => {
    const validateCustomer = async () => {
      const customerId = getCustomerId();
      
      if (!customerId || customerId === "undefined") {
        setCustomerExists(false);
        return;
      }
      
      setValidatingCustomer(true);
      try {
        const customer = await findCustomerById(customerId);
        setCustomerExists(!!customer);
      } catch (error) {
        setCustomerExists(false);
      } finally {
        setValidatingCustomer(false);
      }
    };

    validateCustomer();
  }, []);

  async function handleOnboardingInline(p: { name: string; lastName: string; email: string; consent: boolean }) {
    const next = { ...storage.read(), ...p, sessionId, locale: lang };
    storage.write(next);
    setProfile(next);
    try {
      const customer = await createCustomer({ name: p.name, lastName: p.lastName, email: p.email });
      
      if (customer.id) {
        setCustomerId(customer.id);
        setCustomerExists(true);
        
        setMsgs((m) => {
          setTimeout(() => scrollBottom(), 0);
          return [
            ...m,
            { id: crypto.randomUUID(), who: "assistant", text: lang === "es" ? "Gracias. ¿En qué puedo ayudarte?" : "Thanks. How can I help?" },
          ];
        });
      } else {
        pushToast(lang === "es" ? "Error en el registro" : "Registration error");
      }
    } catch (error) {
      pushToast(lang === "es" ? "No se pudo registrar" : "Registration failed");
    } finally {
      setTimeout(scrollBottom, 30);
    }
  }

  function renderMarkdown(md?: string) {
    if (!md) return null;
    
    // Configurar renderer personalizado para enlaces
    const renderer = new marked.Renderer();
    renderer.link = ({ href, title, tokens }) => {
      const text = tokens.map(token => token.raw || '').join('');
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
    };
    
    let html = DOMPurify.sanitize(marked.parse(md, { renderer }) as string, { USE_PROFILES: { html: true } });
    
    // Post-procesar para asegurar que todos los enlaces tengan target="_blank"
    html = html.replace(/<a\s+([^>]*?)>/gi, (match, attrs) => {
      // Si ya tiene target="_blank", no modificar
      if (/target\s*=\s*["']_blank["']/i.test(attrs)) {
        return match;
      }
      // Agregar target="_blank" y rel="noopener noreferrer" si no los tiene
      let newAttrs = attrs;
      if (!/target\s*=/i.test(newAttrs)) {
        newAttrs += ' target="_blank"';
      }
      if (!/rel\s*=/i.test(newAttrs)) {
        newAttrs += ' rel="noopener noreferrer"';
      }
      return `<a ${newAttrs}>`;
    });
    
    // Mejorar texto de enlaces existentes que contienen PDFs
    html = html.replace(/<a\s+([^>]*?)>(.*?)<\/a>/gi, (match, attrs, text) => {
      // Si el href contiene un PDF, cambiar el texto a algo más amigable
      if (attrs.includes('.pdf')) {
        return `<a ${attrs}>Descargar manual de partes</a>`;
      }
      return match;
    });
    
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }

  async function send(text: string) {
    const v = text.trim();
    if (!v) return;
    
    const customerId = getCustomerId();
    
    const user: ChatMessage = { id: crypto.randomUUID(), who: "user", text: v };
    setMsgs((m) => {
      setTimeout(() => scrollBottom(), 0);
      return [...m, user];
    });
    setTyping(true);

    try {
      if (!customerId || customerId === "undefined") {
        pushToast(lang === "es" ? "Completa tus datos primero" : "Complete your info first");
        setTyping(false);
        return;
      }
      
      let conversationId = getConversationId();
      let session_id = getRagSessionId() || undefined;

      const payload: any = {
        customerId,
        question: v,
        metadata: { path: location.pathname, locale: lang },
      };
      if (session_id) {
        payload.session_id = session_id;
        if (conversationId) payload.conversationId = conversationId;
      }

      const r = await askQuestion(payload);
      if (r.session_id) {
        setRagSessionId(r.session_id);
        setConversationId(r.session_id);
      }
      const botMsg: ChatMessage = { id: crypto.randomUUID(), who: "assistant", text: r.answer };
      setMsgs((m) => {
        setTimeout(() => scrollBottom(), 0);
        return [...m, botMsg];
      });
    } catch (error) {
      setMsgs((m) => {
        setTimeout(() => scrollBottom(), 0);
        return [...m, { id: crypto.randomUUID(), who: "assistant", text: lang === "es" ? "Error, inténtalo de nuevo." : "Error, try again." }];
      });
    } finally {
      setTyping(false);
    }
  }

  function autoResize() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const min = 36, max = 120;
    el.style.height = Math.max(min, Math.min(max, el.scrollHeight)) + "px";
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const v = inputRef.current!.value.trim();
      if (v) { inputRef.current!.value = ""; autoResize(); send(v); }
    }
  }

  function OnboardingBubble() {
    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [consent, setConsent] = useState(false);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = name.trim() && lastName.trim() && emailRe.test(email.trim()) && consent;

    // Validación visual para el email
    const emailTouched = email.length > 0;
    const emailValid = emailRe.test(email.trim());
    const emailInvalid = emailTouched && !emailValid;

    return (
      <div className="pc-bubble pc-bot pc-onb-bubble">
        <div className="pc-card pc-onb-card" style={{ width: "100%", maxHeight: "340px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
          <div style={{ color: "#333", marginBottom: 4 }}>
            {lang === "es" ? "Antes de empezar, tus datos:" : "Before we start, your details:"}
          </div>
          <input className="pc-field" placeholder={t(lang, "name")}
            value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
          <input className="pc-field" placeholder={t(lang, "lastName")}
            value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
          <input
            className="pc-field"
            type="email"
            placeholder={t(lang, "email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={emailInvalid ? { boxShadow: '0 0 0 2px #ff3b3b' } : {}}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "center", font: "13px Inter,system-ui" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              {t(lang, "consent")} {" "}
              <a href="https://briggs.lawnmowers.parts/terms-conditions/" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>
                {lang === "es" ? "Términos y condiciones" : "Terms and conditions"}
              </a>
            </span>
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button className="pc-btn-primary" disabled={!valid}
              onClick={() => valid && handleOnboardingInline({
                name: name.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                consent
              })}>
              {t(lang, "start")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayUserName =
    (profile.name && String(profile.name)) ||
    (profile.email ? String(profile.email).split("@")[0] : "") ||
    (lang === "es" ? "Tú" : "You");

  return (
    <>
      {!props.hideFab && (
        <button
          ref={fabRef}
          className="pc-btn pc-fab"
          onClick={() => {
            if (!open) {
              setOpen(true);
              setMinimized(false);
              track("chat_open");
            } else {
              setOpen(false);
              setMinimized(false);
              track("chat_close");
            }
          }}
          aria-label={t(lang, "open")}
        >
          <span className="pc-btn-icon">
            <img src={robotIcon} alt="" />
          </span>
        </button>
      )}

      <div
        id="pc-panel"
        className={cn("pc-panel", (open && !minimized) ? "pc-open" : "", animClass)}
        role="dialog"
        aria-label={props.title}
        style={{ fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}
      >
        <div id="pc-header" className="pc-header">
          <img className="pc-avatar" src={props.logoUrl || "/vite.svg"} alt="" />
          <span className="pc-title">{props.title}</span>

          <div className="pc-tools">
            {/* Eliminado el selector de idioma */}
            <button className="pc-min" onClick={() => window.openProntoChat()}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
            </button>
          </div>
        </div>

        <div className="pc-msgs" ref={msgsRef}>
          {msgs.map((m) => (
            <div key={m.id} className={cn("pc-row", m.who === "user" ? "pc-row-me" : "pc-row-bot")}>
              <div className={cn("pc-name", m.who === "user" ? "pc-name-me" : "pc-name-bot")}>
                {m.who === "user" ? displayUserName : props.title}
              </div>
              <div className={cn("pc-bubble", m.who === "user" ? "pc-me" : "pc-bot")}>
                {renderMarkdown(m.text)}
              </div>
            </div>
          ))}

          {validatingCustomer && (
            <div className={cn("pc-row", "pc-row-bot")}>
              <div className="pc-name pc-name-bot">{props.title}</div>
              <div className="pc-bubble pc-bot">
                <div className="pc-typing"><span className="d"></span><span className="d"></span><span className="d"></span></div>
              </div>
            </div>
          )}

          {hasOnboarding && !validatingCustomer && <OnboardingBubble />}

          {typing && (
            <div className={cn("pc-row", "pc-row-bot")}>
              <div className="pc-name pc-name-bot">{props.title}</div>
              <div className="pc-bubble pc-bot">
                <div className="pc-typing"><span className="d"></span><span className="d"></span><span className="d"></span></div>
              </div>
            </div>
          )}
        </div>

        <div className="pc-footer">
          <textarea
            ref={inputRef}
            className="pc-input"
            rows={1}
            placeholder={lang === "es" ? "Escribe un mensaje" : "Type a message"}
            onKeyDown={onKey}
            onInput={autoResize}
            disabled={hasOnboarding || validatingCustomer}
            style={(hasOnboarding || validatingCustomer) ? { background: '#f3f3f3', cursor: 'not-allowed' } : {}}
          />
          <button
            aria-label={t(lang, "send")}
            className="pc-send"
            onClick={() => {
              const v = inputRef.current!.value.trim();
              if (v) { inputRef.current!.value = ""; autoResize(); send(v); }
            }}
            disabled={hasOnboarding || validatingCustomer}
            style={(hasOnboarding || validatingCustomer) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <PaperPlaneIcon />
          </button>
        </div>
      </div>

      <Toasts />
    </>
  );
}
