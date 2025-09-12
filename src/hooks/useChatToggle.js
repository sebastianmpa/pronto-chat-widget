import { useState, useEffect } from "react";
import { track } from "@/lib/analytics";
export function useChatToggle(hideFab) {
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [animClass, setAnimClass] = useState("");
    // Controlar la apertura del chat para el botón personalizado
    useEffect(() => {
        if (!hideFab)
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
    }, [hideFab, open]);
    // Animación al abrir/minimizar
    useEffect(() => {
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
    }, [open, minimized, animClass]);
    const toggleChat = () => {
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
    };
    return {
        open,
        minimized,
        animClass,
        setOpen,
        setMinimized,
        toggleChat,
    };
}
