import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import cn from "classnames";
import { t, detectLang } from "@/lib/i18n";
import { storage, ensureSessionId, setCustomerId, getCustomerId, setConversationId, getConversationId, setRagSessionId, } from "@/lib/storage";
import { track } from "@/lib/analytics";
import { createCustomer, askQuestion, findCustomerById, submitRating } from "@/lib/api";
import Toasts, { pushToast } from "./Toast";
import robotIcon from "@/assets/imagen2.png";
function PaperPlaneIcon() {
    return (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: "M2 21l20-9L2 3v6l14 3L2 15v6z", fill: "currentColor" }) }));
}
function useDrag(enabled, open) {
    useEffect(() => {
        if (!enabled || !open)
            return;
        const panelEl = document.getElementById("pc-panel");
        const headerEl = document.getElementById("pc-header");
        if (!panelEl || !headerEl)
            return;
        let sx = 0, sy = 0, x = panelEl.offsetLeft, y = panelEl.offsetTop, dragging = false;
        const md = (e) => { dragging = true; sx = e.clientX; sy = e.clientY; e.preventDefault(); };
        const mm = (e) => {
            if (!dragging)
                return;
            x += e.clientX - sx;
            y += e.clientY - sy;
            sx = e.clientX;
            sy = e.clientY;
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
export default function ChatWidget(props) {
    useEffect(() => {
        const r = document.documentElement;
        r.style.setProperty("--pc-primary", props.primary);
        r.style.setProperty("--pc-bg", props.bg);
        r.style.setProperty("--pc-radius", `${props.bubbleRadius}px`);
    }, [props.primary, props.bg, props.bubbleRadius]);
    const initial = storage.read();
    const [profile, setProfile] = useState(initial);
    const lang = initial.locale || detectLang();
    const fabRef = useRef(null);
    const [open, setOpen] = useState(false); // Siempre inicia cerrado
    const [minimized, setMinimized] = useState(false);
    const [animClass, setAnimClass] = useState("");
    // Controlar la apertura del chat para el botón personalizado
    useEffect(() => {
        if (!props.hideFab)
            return; // Solo si hideFab está activo
        const handleToggleChat = () => {
            setOpen(prev => !prev);
            setMinimized(false);
            if (!open) {
                track("chat_open");
            }
            else {
                track("chat_close");
            }
        };
        // Escuchar el evento global
        document.addEventListener('toggle-pronto-chat', handleToggleChat);
        return () => document.removeEventListener('toggle-pronto-chat', handleToggleChat);
    }, [props.hideFab, open]);
    const sessionId = useMemo(() => ensureSessionId(), []);
    const [msgs, setMsgs] = useState([]);
    const [typing, setTyping] = useState(false);
    const inputRef = useRef(null);
    const msgsRef = useRef(null);
    // Estados para la validación del customer
    const [customerExists, setCustomerExists] = useState(null); // null = checking, true = exists, false = not exists
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
        }
        else if (!open && minimized === false && animClass !== "pc-minimizing") {
            setAnimClass("pc-minimizing");
            const timeout = setTimeout(() => setAnimClass("pc-hidden"), 380);
            return () => clearTimeout(timeout);
        }
    }, [open, minimized]);
    useEffect(() => {
        if (!open)
            return;
        if (msgs.length === 0) {
            const stored = storage.read();
            const welcome = {
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
        if (props.hideFab)
            return; // Skip si hideFab está activo (ya manejado por el otro efecto)
        window.openProntoChat = () => {
            if (fabRef.current) {
                fabRef.current.click();
            }
        };
        return () => {
            delete window.openProntoChat;
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
            }
            catch (error) {
                setCustomerExists(false);
                // Si el customer no existe en la BD, limpiar todos los datos relacionados
                setRagSessionId("");
                // También podemos limpiar el customerId para que muestre onboarding limpio
                setCustomerId("");
            }
            finally {
                setValidatingCustomer(false);
            }
        };
        validateCustomer();
    }, []);
    async function handleOnboardingInline(p) {
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
            }
            else {
                pushToast(lang === "es" ? "Error en el registro" : "Registration error");
            }
        }
        catch (error) {
            pushToast(lang === "es" ? "No se pudo registrar" : "Registration failed");
        }
        finally {
            setTimeout(scrollBottom, 30);
        }
    }
    function renderMarkdown(md) {
        if (!md)
            return null;
        // Configurar renderer personalizado para enlaces
        const renderer = new marked.Renderer();
        renderer.link = ({ href, title, tokens }) => {
            const text = tokens.map(token => token.raw || '').join('');
            return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
        };
        let html = DOMPurify.sanitize(marked.parse(md, { renderer }), { USE_PROFILES: { html: true } });
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
        return _jsx("div", { dangerouslySetInnerHTML: { __html: html } });
    }
    async function send(text) {
        const v = text.trim();
        if (!v)
            return;
        const customerId = getCustomerId();
        const user = { id: crypto.randomUUID(), who: "user", text: v };
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
            const payload = {
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
            const botMsg = { id: crypto.randomUUID(), who: "assistant", text: r.answer };
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
                    const ratingMsg = {
                        id: crypto.randomUUID(),
                        who: "assistant",
                        text: "rating_request" // Identificador especial para mostrar el rating inline
                    };
                    setMsgs(prev => [...prev, ratingMsg]);
                    setTimeout(() => scrollBottom(), 0);
                }, 1000); // Esperar 1 segundo después de mostrar la respuesta
            }
        }
        catch (error) {
            setMsgs((m) => {
                setTimeout(() => scrollBottom(), 0);
                return [...m, { id: crypto.randomUUID(), who: "assistant", text: lang === "es" ? "Error, inténtalo de nuevo." : "Error, try again." }];
            });
        }
        finally {
            setTyping(false);
        }
    }
    function autoResize() {
        const el = inputRef.current;
        if (!el)
            return;
        el.style.height = "auto";
        const min = 36, max = 120;
        el.style.height = Math.max(min, Math.min(max, el.scrollHeight)) + "px";
    }
    function onKey(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const v = inputRef.current.value.trim();
            if (v) {
                inputRef.current.value = "";
                autoResize();
                send(v);
            }
        }
    }
    // Función para mostrar confirmación de finalizar chat
    function handleEndChat() {
        const conversationId = getConversationId();
        // Siempre mostrar confirmación, independientemente de si hay conversation_id
        setShowEndChatConfirmation(true);
        // Agregar mensaje de confirmación como mensaje del bot
        const confirmationMsg = {
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
            const ratingMsg = {
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
            const cancelMsg = {
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
    async function handleSubmitRating(rating, comment) {
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
        }
        catch (error) {
            pushToast(lang === "es" ? "Error al enviar calificación" : "Error submitting rating");
        }
    }
    // Componente de confirmación inline
    function EndChatConfirmationBubble() {
        return (_jsx("div", { className: "pc-bubble pc-bot", children: _jsxs("div", { className: "pc-confirmation-inline", children: [_jsx("p", { style: { margin: "0 0 12px", color: "#333", fontSize: "14px" }, children: lang === "es"
                            ? "¿Estás seguro de que quieres finalizar esta conversación?"
                            : "Are you sure you want to end this conversation?" }), _jsxs("div", { className: "pc-confirmation-buttons", children: [_jsx("button", { className: "pc-confirm-btn pc-confirm-yes", onClick: confirmEndChat, style: {
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
                                }, children: lang === "es" ? "Sí" : "Yes" }), _jsx("button", { className: "pc-confirm-btn pc-confirm-no", onClick: cancelEndChat, style: {
                                    background: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "8px 16px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "background-color 0.2s"
                                }, children: lang === "es" ? "No" : "No" })] })] }) }));
    }
    // Componente de rating inline
    function RatingBubble() {
        const [selectedRating, setSelectedRating] = useState(null);
        const [comment, setComment] = useState("");
        const handleSubmit = () => {
            if (selectedRating) {
                handleSubmitRating(selectedRating, comment.trim() || undefined);
            }
        };
        const getRatingEmoji = (rating) => {
            switch (rating) {
                case "good": return "😊";
                case "neutral": return "😐";
                case "bad": return "😞";
            }
        };
        return (_jsx("div", { className: "pc-bubble pc-bot", children: _jsxs("div", { className: "pc-rating-inline", children: [_jsx("p", { style: { margin: "0 0 12px", color: "#333", fontSize: "14px" }, children: t(lang, "ratePrompt") }), _jsx("div", { className: "pc-rating-options-inline", children: ["good", "neutral", "bad"].map((rating) => (_jsxs("button", { className: `pc-rating-option-inline ${selectedRating === rating ? "selected" : ""}`, onClick: () => setSelectedRating(rating), children: [_jsx("span", { className: "pc-rating-emoji-inline", children: getRatingEmoji(rating) }), _jsx("span", { className: "pc-rating-text-inline", children: t(lang, rating) })] }, rating))) }), _jsx("textarea", { className: "pc-rating-comment-inline", placeholder: t(lang, "commentOptional"), value: comment, onChange: (e) => setComment(e.target.value), rows: 2, style: {
                            width: "100%",
                            border: "1px solid #e0e0e0",
                            borderRadius: "6px",
                            padding: "8px",
                            fontSize: "13px",
                            resize: "none",
                            margin: "8px 0",
                            fontFamily: "inherit",
                            boxSizing: "border-box"
                        } }), _jsx("button", { className: "pc-rating-submit-inline", onClick: handleSubmit, disabled: !selectedRating, style: {
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
                        }, children: t(lang, "submitRating") })] }) }));
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
        return (_jsx("div", { className: "pc-bubble pc-bot pc-onb-bubble", children: _jsxs("div", { className: "pc-card pc-onb-card", style: { width: "100%", maxHeight: "340px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }, children: [_jsx("div", { style: { color: "#333", marginBottom: 4 }, children: lang === "es" ? "Antes de empezar, tus datos:" : "Before we start, your details:" }), _jsx("input", { className: "pc-field", placeholder: t(lang, "name"), value: name, onChange: (e) => setName(e.target.value), autoComplete: "given-name" }), _jsx("input", { className: "pc-field", placeholder: t(lang, "lastName"), value: lastName, onChange: (e) => setLastName(e.target.value), autoComplete: "family-name" }), _jsx("input", { className: "pc-field", type: "email", placeholder: t(lang, "email"), value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email", style: emailInvalid ? { boxShadow: '0 0 0 2px #ff3b3b' } : {} }), _jsxs("label", { style: { display: "flex", gap: 8, alignItems: "center", font: "13px Inter,system-ui" }, children: [_jsx("input", { type: "checkbox", checked: consent, onChange: (e) => setConsent(e.target.checked) }), _jsxs("span", { children: [t(lang, "consent"), " ", " ", _jsx("a", { href: "https://briggs.lawnmowers.parts/terms-conditions/", target: "_blank", rel: "noopener noreferrer", style: { color: '#007bff', textDecoration: 'underline' }, children: lang === "es" ? "Términos y condiciones" : "Terms and conditions" })] })] }), _jsx("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: 4 }, children: _jsx("button", { className: "pc-btn-primary", disabled: !valid, onClick: () => valid && handleOnboardingInline({
                                name: name.trim(),
                                lastName: lastName.trim(),
                                email: email.trim().toLowerCase(),
                                consent
                            }), children: t(lang, "start") }) })] }) }));
    }
    const displayUserName = (profile.name && String(profile.name)) ||
        (profile.email ? String(profile.email).split("@")[0] : "") ||
        (lang === "es" ? "Tú" : "You");
    return (_jsxs(_Fragment, { children: [!props.hideFab && (_jsx("button", { ref: fabRef, className: "pc-btn pc-fab", onClick: () => {
                    if (!open) {
                        setOpen(true);
                        setMinimized(false);
                        track("chat_open");
                    }
                    else {
                        setOpen(false);
                        setMinimized(false);
                        track("chat_close");
                    }
                }, "aria-label": t(lang, "open"), children: _jsx("span", { className: "pc-btn-icon", children: _jsx("img", { src: robotIcon, alt: "" }) }) })), _jsxs("div", { id: "pc-panel", className: cn("pc-panel", (open && !minimized) ? "pc-open" : "", animClass), role: "dialog", "aria-label": props.title, style: { fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }, children: [_jsxs("div", { id: "pc-header", className: "pc-header", children: [_jsx("img", { className: "pc-avatar", src: props.logoUrl || "/vite.svg", alt: "" }), _jsx("span", { className: "pc-title", children: props.title }), _jsx("div", { className: "pc-tools", children: _jsx("button", { className: "pc-min", onClick: () => window.openProntoChat(), children: _jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", children: _jsx("path", { fill: "currentColor", d: "M7 10l5 5 5-5z" }) }) }) })] }), _jsxs("div", { className: "pc-msgs", ref: msgsRef, children: [msgs.map((m) => (_jsxs("div", { className: cn("pc-row", m.who === "user" ? "pc-row-me" : "pc-row-bot"), children: [_jsx("div", { className: cn("pc-name", m.who === "user" ? "pc-name-me" : "pc-name-bot"), children: m.who === "user" ? displayUserName : props.title }), m.text === "rating_request" ? (_jsx(RatingBubble, {})) : m.text === "end_chat_confirmation" ? (_jsx(EndChatConfirmationBubble, {})) : (_jsx("div", { className: cn("pc-bubble", m.who === "user" ? "pc-me" : "pc-bot"), children: renderMarkdown(m.text) }))] }, m.id))), validatingCustomer && (_jsxs("div", { className: cn("pc-row", "pc-row-bot"), children: [_jsx("div", { className: "pc-name pc-name-bot", children: props.title }), _jsx("div", { className: "pc-bubble pc-bot", children: _jsxs("div", { className: "pc-typing", children: [_jsx("span", { className: "d" }), _jsx("span", { className: "d" }), _jsx("span", { className: "d" })] }) })] })), hasOnboarding && !validatingCustomer && _jsx(OnboardingBubble, {}), typing && (_jsxs("div", { className: cn("pc-row", "pc-row-bot"), children: [_jsx("div", { className: "pc-name pc-name-bot", children: props.title }), _jsx("div", { className: "pc-bubble pc-bot", children: _jsxs("div", { className: "pc-typing", children: [_jsx("span", { className: "d" }), _jsx("span", { className: "d" }), _jsx("span", { className: "d" })] }) })] }))] }), !conversationEnded && msgs.length > 0 && (_jsxs("div", { className: "pc-turn-off-above-input", children: [_jsx("span", { className: "pc-turn-off-text-inline", children: t(lang, "turnOffSignal") }), _jsx("button", { className: "pc-turn-off-btn-inline", onClick: handleEndChat, title: t(lang, "turnOffSignal"), children: _jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.59-5.41L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" }) }) })] })), _jsxs("div", { className: "pc-footer", children: [_jsx("textarea", { ref: inputRef, className: "pc-input", rows: 1, placeholder: lang === "es" ? "Escribe un mensaje" : "Type a message", onKeyDown: onKey, onInput: autoResize, disabled: hasOnboarding || validatingCustomer || conversationEnded, style: (hasOnboarding || validatingCustomer || conversationEnded) ? { background: '#f3f3f3', cursor: 'not-allowed' } : {} }), _jsx("button", { "aria-label": t(lang, "send"), className: "pc-send", onClick: () => {
                                    const v = inputRef.current.value.trim();
                                    if (v) {
                                        inputRef.current.value = "";
                                        autoResize();
                                        send(v);
                                    }
                                }, disabled: hasOnboarding || validatingCustomer || conversationEnded, style: (hasOnboarding || validatingCustomer || conversationEnded) ? { opacity: 0.5, cursor: 'not-allowed' } : {}, children: _jsx(PaperPlaneIcon, {}) })] }), _jsx("div", { className: "pc-disclaimer", children: t(lang, "disclaimer") })] }), _jsx(Toasts, {})] }));
}
