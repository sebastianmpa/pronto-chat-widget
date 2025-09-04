import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import cn from "classnames";
import { t, detectLang } from "@/lib/i18n";
import { storage, ensureSessionId, setCustomerId, getCustomerId, setConversationId, getConversationId, setRagSessionId, getRagSessionId, } from "@/lib/storage";
import { track } from "@/lib/analytics";
import { createCustomer, askQuestion } from "@/lib/api";
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
    const [open, setOpen] = useState(props.hideFab ? true : false);
    const [minimized, setMinimized] = useState(false);
    const [animClass, setAnimClass] = useState("");
    const sessionId = useMemo(() => ensureSessionId(), []);
    const [msgs, setMsgs] = useState([]);
    const [typing, setTyping] = useState(false);
    const inputRef = useRef(null);
    const msgsRef = useRef(null);
    // Solo mostrar onboarding si no existe customerId
    const hasOnboarding = !getCustomerId();
    function scrollBottom() {
        if (msgsRef.current)
            msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
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
            const welcome = { id: crypto.randomUUID(), who: "assistant", text: t(lang, "welcome") };
            setMsgs([welcome]);
        }
        setTimeout(scrollBottom, 50);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    // Exponer función global para abrir el chat
    useEffect(() => {
        window.openProntoChat = () => {
            var _a;
            if (props.hideFab) {
                setOpen(true);
                setMinimized(false);
            }
            else {
                (_a = fabRef.current) === null || _a === void 0 ? void 0 : _a.click();
            }
        };
        return () => {
            delete window.openProntoChat;
        };
    }, [props.hideFab]);
    async function handleOnboardingInline(p) {
        const next = { ...storage.read(), ...p, sessionId, locale: lang };
        storage.write(next);
        setProfile(next);
        try {
            const customer = await createCustomer({ name: p.name, lastName: p.lastName, email: p.email });
            setCustomerId(customer.id);
            // El onboarding ya no se muestra porque ya existe customerId
            setMsgs((m) => [
                ...m,
                { id: crypto.randomUUID(), who: "assistant", text: lang === "es" ? "Gracias. ¿En qué puedo ayudarte?" : "Thanks. How can I help?" },
            ]);
        }
        catch {
            pushToast(lang === "es" ? "No se pudo registrar" : "Registration failed");
        }
        finally {
            setTimeout(scrollBottom, 30);
        }
    }
    function renderMarkdown(md) {
        if (!md)
            return null;
        const html = DOMPurify.sanitize(marked.parse(md), { USE_PROFILES: { html: true } });
        return _jsx("div", { dangerouslySetInnerHTML: { __html: html } });
    }
    async function send(text) {
        const v = text.trim();
        if (!v)
            return;
        const user = { id: crypto.randomUUID(), who: "user", text: v };
        setMsgs((m) => [...m, user]);
        setTyping(true);
        try {
            const customerId = getCustomerId();
            if (!customerId) {
                pushToast(lang === "es" ? "Completa tus datos primero" : "Complete your info first");
                setTyping(false);
                return;
            }
            // En la primera pregunta no hay conversationId ni session_id
            let conversationId = getConversationId();
            let session_id = getRagSessionId() || undefined;
            // Si no hay session_id, es la primera pregunta: solo enviar customerId y question
            const payload = {
                customerId,
                question: v,
                metadata: { path: location.pathname, locale: lang },
            };
            if (session_id) {
                payload.session_id = session_id;
                // conversationId se usa solo si ya existe session_id
                if (conversationId)
                    payload.conversationId = conversationId;
            }
            const r = await askQuestion(payload);
            // En la primera respuesta, guardar el session_id y usarlo como conversationId
            if (r.session_id) {
                setRagSessionId(r.session_id);
                setConversationId(r.session_id);
            }
            const botMsg = { id: crypto.randomUUID(), who: "assistant", text: r.answer };
            setMsgs((m) => [...m, botMsg]);
        }
        catch {
            setMsgs((m) => [...m, { id: crypto.randomUUID(), who: "assistant", text: lang === "es" ? "Error, inténtalo de nuevo." : "Error, try again." }]);
        }
        finally {
            setTyping(false);
            setTimeout(scrollBottom, 30);
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
                }, "aria-label": t(lang, "open"), children: _jsx("span", { className: "pc-btn-icon", children: _jsx("img", { src: robotIcon, alt: "" }) }) })), _jsxs("div", { id: "pc-panel", className: cn("pc-panel", (open && !minimized) ? "pc-open" : "", animClass), role: "dialog", "aria-label": props.title, style: { fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }, children: [_jsxs("div", { id: "pc-header", className: "pc-header", children: [_jsx("img", { className: "pc-avatar", src: props.logoUrl || "/vite.svg", alt: "" }), _jsx("span", { className: "pc-title", children: props.title }), _jsx("div", { className: "pc-tools", children: _jsx("button", { className: "pc-min", onClick: () => { setOpen(false); setMinimized(false); }, children: _jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", children: _jsx("path", { fill: "currentColor", d: "M7 10l5 5 5-5z" }) }) }) })] }), _jsxs("div", { className: "pc-msgs", ref: msgsRef, children: [msgs.map((m) => (_jsxs("div", { className: cn("pc-row", m.who === "user" ? "pc-row-me" : "pc-row-bot"), children: [_jsx("div", { className: cn("pc-name", m.who === "user" ? "pc-name-me" : "pc-name-bot"), children: m.who === "user" ? displayUserName : props.title }), _jsx("div", { className: cn("pc-bubble", m.who === "user" ? "pc-me" : "pc-bot"), children: renderMarkdown(m.text) })] }, m.id))), hasOnboarding && _jsx(OnboardingBubble, {}), typing && (_jsxs("div", { className: cn("pc-row", "pc-row-bot"), children: [_jsx("div", { className: "pc-name pc-name-bot", children: props.title }), _jsx("div", { className: "pc-bubble pc-bot", children: _jsxs("div", { className: "pc-typing", children: [_jsx("span", { className: "d" }), _jsx("span", { className: "d" }), _jsx("span", { className: "d" })] }) })] }))] }), _jsxs("div", { className: "pc-footer", children: [_jsx("textarea", { ref: inputRef, className: "pc-input", rows: 1, placeholder: lang === "es" ? "Escribe un mensaje" : "Type a message", onKeyDown: onKey, onInput: autoResize, disabled: hasOnboarding, style: hasOnboarding ? { background: '#f3f3f3', cursor: 'not-allowed' } : {} }), _jsx("button", { "aria-label": t(lang, "send"), className: "pc-send", onClick: () => {
                                    const v = inputRef.current.value.trim();
                                    if (v) {
                                        inputRef.current.value = "";
                                        autoResize();
                                        send(v);
                                    }
                                }, disabled: hasOnboarding, style: hasOnboarding ? { opacity: 0.5, cursor: 'not-allowed' } : {}, children: _jsx(PaperPlaneIcon, {}) })] })] }), _jsx(Toasts, {})] }));
}
