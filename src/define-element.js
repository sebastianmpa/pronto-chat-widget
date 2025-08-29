import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import ChatWidget from "@/components/ChatWidget";
import { setBase } from "@/lib/api";
// ⚠️ Importa el CSS como string y lo inyectamos en el Shadow DOM
// (esto evita 404 y que tengas que linkear un .css aparte)
import styles from "@/styles/widget.css?inline";
class ProntoChatElement extends HTMLElement {
    connectedCallback() {
        var _a;
        const endpoint = this.getAttribute("data-endpoint") || "";
        const title = this.getAttribute("data-title") || "Pronto Mowers";
        const primary = this.getAttribute("data-primary") || "#ff6a00";
        const bg = this.getAttribute("data-bg") || "#f3f6fc";
        const radius = Number(this.getAttribute("data-bubble-radius") || 12);
        const token = (_a = this.getAttribute("data-access-token")) !== null && _a !== void 0 ? _a : null;
        const logoUrl = this.getAttribute("data-logo-url") || null;
        const enableDrag = this.getAttribute("data-draggable") === "true";
        setBase(endpoint);
        const shadow = this.attachShadow({ mode: "open" });
        // Inyecta el CSS dentro del shadow
        const styleTag = document.createElement("style");
        styleTag.textContent = styles;
        shadow.appendChild(styleTag);
        // Mount point
        const mount = document.createElement("div");
        shadow.appendChild(mount);
        const root = createRoot(mount);
        root.render(_jsx(ChatWidget, { endpoint: endpoint, title: title, primary: primary, bg: bg, bubbleRadius: radius, token: token, logoUrl: logoUrl, enableDrag: enableDrag }));
    }
}
// 🔵 Registra el custom element inmediatamente (no hay que llamar nada)
if (!customElements.get("pronto-chat")) {
    customElements.define("pronto-chat", ProntoChatElement);
}
