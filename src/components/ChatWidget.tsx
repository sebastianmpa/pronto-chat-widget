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
import { createCustomer, askQuestion, findCustomerById, submitRating } from "@/lib/api";
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
  
  // Estados para el sistema de rating
  const [conversationEnded, setConversationEnded] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showEndChatConfirmation, setShowEndChatConfirmation] = useState(false);
  const [showRatingBubble, setShowRatingBubble] = useState(false);

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

   // Validar customer al cargar el componente y limpiar conversation_id en cada refresh
   useEffect(() => {
     // Siempre limpiar el conversation_id al cargar la página (refresh)
     setConversationId("");
     
     const validateCustomer = async () => {
       const customerId = getCustomerId();
       
       if (!customerId || customerId === "undefined") {
         setCustomerExists(false);
         // Limpiar cualquier ragSessionId anterior si no hay customer
         setRagSessionId("");
         return;
       }
       
       setValidatingCustomer(true);
       try {
         const customer = await findCustomerById(customerId);
         setCustomerExists(!!customer);
       } catch (error) {
         setCustomerExists(false);
         // Si el customer no existe en la BD, limpiar todos los datos relacionados
         setRagSessionId("");
         // También podemos limpiar el customerId para que muestre onboarding limpio
         setCustomerId("");
       } finally {
         setValidatingCustomer(false);
       }
     };

     validateCustomer();
   }, []);  async function handleOnboardingInline(p: { name: string; lastName: string; email: string; consent: boolean }) {
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
      
      // Dominio fijo para Echo Parts Online
      const storeDomain = "www.echopartsonline.com";
      
      // Convertir lang a formato IETF BCP 47
      const langCode = lang === "es" ? "es-ES" : "en-US";

      const payload: any = {
        customer_id: customerId,
        question: v,
        lang: langCode,
        store_domain: storeDomain,
      };
      
      // Solo agregar conversation_id si existe y no está vacío
      if (conversationId && conversationId.trim() !== "") {
        payload.conversation_id = conversationId;
      }

      const r = await askQuestion(payload);
      
      // Guardar el conversation_id que devuelve la API (siempre que venga uno válido)
      if (r.conversation_id && r.conversation_id.trim() !== "") {
        setConversationId(r.conversation_id);
      }
      
      const botMsg: ChatMessage = { id: crypto.randomUUID(), who: "assistant", text: r.answer };
      setMsgs((m) => {
        setTimeout(() => scrollBottom(), 0);
        return [...m, botMsg];
      });

      // *** ESCENARIO 1: RATING AUTOMÁTICO ***
      // El backend devuelve close_chat: true, se debe mostrar el rating automáticamente
      if (r.close_chat === true) {
        // Esperar un momento para que se muestre la respuesta del bot
        setTimeout(() => {
          setConversationEnded(true);
          setShowRatingBubble(true);
          
          // Agregar mensaje de rating como mensaje del bot
          const ratingMsg: ChatMessage = {
            id: crypto.randomUUID(),
            who: "assistant", 
            text: "rating_request" // Identificador especial para mostrar el rating inline
          };
          setMsgs(prev => [...prev, ratingMsg]);
          setTimeout(() => scrollBottom(), 0);
        }, 1000); // Esperar 1 segundo después de mostrar la respuesta
      }
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

  // Función para mostrar confirmación de finalizar chat
  function handleEndChat() {
    const conversationId = getConversationId();
    // Siempre mostrar confirmación, independientemente de si hay conversation_id
    setShowEndChatConfirmation(true);
    // Agregar mensaje de confirmación como mensaje del bot
    const confirmationMsg: ChatMessage = {
      id: crypto.randomUUID(),
      who: "assistant",
      text: "end_chat_confirmation" // Identificador especial
    };
    setMsgs(prev => [...prev, confirmationMsg]);
    setTimeout(() => scrollBottom(), 0);
  }

  // *** ESCENARIO 2: RATING MANUAL ***
  // El usuario hace clic en "Finalizar chat" y confirma con "Sí"
  function confirmEndChat() {
    setShowEndChatConfirmation(false);
    setConversationEnded(true);
    
    // Primero, remover el mensaje de confirmación de los mensajes
    setMsgs(prev => prev.filter(msg => msg.text !== "end_chat_confirmation"));
    
    // SIEMPRE mostrar rating cuando el usuario termina manualmente el chat
    setShowRatingBubble(true);
    
    // Agregar mensaje de rating como mensaje del bot
    setTimeout(() => {
      const ratingMsg: ChatMessage = {
        id: crypto.randomUUID(),
        who: "assistant", 
        text: "rating_request" // Identificador especial para mostrar el rating inline
      };
      setMsgs(prev => [...prev, ratingMsg]);
      setTimeout(() => scrollBottom(), 0);
    }, 300); // Pequeño delay para que se vea la transición
  }

  // Función para cancelar el fin del chat
  function cancelEndChat() {
    setShowEndChatConfirmation(false);
    
    // Remover el mensaje de confirmación y agregar mensaje de continuación
    setMsgs(prev => {
      const filteredMsgs = prev.filter(msg => msg.text !== "end_chat_confirmation");
      const cancelMsg: ChatMessage = {
        id: crypto.randomUUID(),
        who: "assistant",
        text: lang === "es" 
          ? "De acuerdo, continuemos con la conversación. ¿En qué más puedo ayudarte?" 
          : "Alright, let's continue the conversation. What else can I help you with?"
      };
      return [...filteredMsgs, cancelMsg];
    });
    setTimeout(() => scrollBottom(), 0);
  }

  // Función para manejar el envío de rating
  async function handleSubmitRating(rating: "good" | "neutral" | "bad", comment?: string) {
    const conversationId = getConversationId();
    if (!conversationId) {
      pushToast(lang === "es" ? "Error: No hay conversación activa" : "Error: No active conversation");
      return;
    }

    try {
      await submitRating({
        conversation_id: conversationId,
        rating,
        comment
      });
      
      setRatingSubmitted(true);
      setShowRatingBubble(false);
      
      // Mostrar mensaje de agradecimiento
      setMsgs(prev => [...prev, {
        id: crypto.randomUUID(),
        who: "assistant",
        text: t(lang, "thankYou")
      }]);
      
      // Limpiar conversation_id después del rating
      setConversationId("");
      
      pushToast(t(lang, "thankYou"));
      
      // Cerrar el chat después de un momento
      setTimeout(() => {
        setOpen(false);
        setConversationEnded(false);
        setRatingSubmitted(false);
      }, 2000);
      
    } catch (error) {
      pushToast(lang === "es" ? "Error al enviar calificación" : "Error submitting rating");
    }
  }

  // Componente de confirmación inline
  function EndChatConfirmationBubble() {
    return (
      <div className="pc-bubble pc-bot">
        <div className="pc-confirmation-inline">
          <p style={{ margin: "0 0 12px", color: "#333", fontSize: "14px" }}>
            {lang === "es" 
              ? "¿Estás seguro de que quieres finalizar esta conversación?" 
              : "Are you sure you want to end this conversation?"
            }
          </p>
          <div className="pc-confirmation-buttons">
            <button
              className="pc-confirm-btn pc-confirm-yes"
              onClick={confirmEndChat}
              style={{
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                marginRight: "8px",
                transition: "background-color 0.2s"
              }}
            >
              {lang === "es" ? "Sí" : "Yes"}
            </button>
            <button
              className="pc-confirm-btn pc-confirm-no"
              onClick={cancelEndChat}
              style={{
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
            >
              {lang === "es" ? "No" : "No"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Componente de rating inline
  function RatingBubble() {
    const [selectedRating, setSelectedRating] = useState<"good" | "neutral" | "bad" | null>(null);
    const [comment, setComment] = useState("");

    const handleSubmit = () => {
      if (selectedRating) {
        handleSubmitRating(selectedRating, comment.trim() || undefined);
      }
    };

    const getRatingEmoji = (rating: "good" | "neutral" | "bad") => {
      switch (rating) {
        case "good": return "😊";
        case "neutral": return "😐";
        case "bad": return "😞";
      }
    };

    return (
      <div className="pc-bubble pc-bot">
        <div className="pc-rating-inline">
          <p style={{ margin: "0 0 12px", color: "#333", fontSize: "14px" }}>
            {t(lang, "ratePrompt")}
          </p>
          
          <div className="pc-rating-options-inline">
            {(["good", "neutral", "bad"] as const).map((rating) => (
              <button
                key={rating}
                className={`pc-rating-option-inline ${selectedRating === rating ? "selected" : ""}`}
                onClick={() => setSelectedRating(rating)}
              >
                <span className="pc-rating-emoji-inline">{getRatingEmoji(rating)}</span>
                <span className="pc-rating-text-inline">{t(lang, rating)}</span>
              </button>
            ))}
          </div>
          
          <textarea
            className="pc-rating-comment-inline"
            placeholder={t(lang, "commentOptional")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            style={{
              width: "100%",
              border: "1px solid #e0e0e0",
              borderRadius: "6px",
              padding: "8px",
              fontSize: "13px",
              resize: "none",
              margin: "8px 0",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          />
          
          <button
            className="pc-rating-submit-inline"
            onClick={handleSubmit}
            disabled={!selectedRating}
            style={{
              width: "100%",
              background: selectedRating ? "var(--pc-primary)" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: selectedRating ? "pointer" : "not-allowed",
              transition: "background-color 0.2s"
            }}
          >
            {t(lang, "submitRating")}
          </button>
        </div>
      </div>
    );
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
              {/* Mostrar componentes especiales inline */}
              {m.text === "rating_request" ? (
                <RatingBubble />
              ) : m.text === "end_chat_confirmation" ? (
                <EndChatConfirmationBubble />
              ) : (
                <div className={cn("pc-bubble", m.who === "user" ? "pc-me" : "pc-bot")}>
                  {renderMarkdown(m.text)}
                </div>
              )}
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

        {/* Botón de turn-off justo arriba del input - siempre presente */}
        {!conversationEnded && msgs.length > 0 && (
          <div className="pc-turn-off-above-input">
            <span className="pc-turn-off-text-inline">
              {t(lang, "turnOffSignal")}
            </span>
            <button 
              className="pc-turn-off-btn-inline" 
              onClick={handleEndChat}
              title={t(lang, "turnOffSignal")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.59-5.41L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/>
              </svg>
            </button>
          </div>
        )}

        <div className="pc-footer">
          <textarea
            ref={inputRef}
            className="pc-input"
            rows={1}
            placeholder={lang === "es" ? "Escribe un mensaje" : "Type a message"}
            onKeyDown={onKey}
            onInput={autoResize}
            disabled={hasOnboarding || validatingCustomer || conversationEnded}
            style={(hasOnboarding || validatingCustomer || conversationEnded) ? { background: '#f3f3f3', cursor: 'not-allowed' } : {}}
          />
          <button
            aria-label={t(lang, "send")}
            className="pc-send"
            onClick={() => {
              const v = inputRef.current!.value.trim();
              if (v) { inputRef.current!.value = ""; autoResize(); send(v); }
            }}
            disabled={hasOnboarding || validatingCustomer || conversationEnded}
            style={(hasOnboarding || validatingCustomer || conversationEnded) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <PaperPlaneIcon />
          </button>
        </div>
        
        {/* Disclaimer */}
        <div className="pc-disclaimer">
          {t(lang, "disclaimer")}
        </div>
      </div>

      <Toasts />
    </>
  );
}
