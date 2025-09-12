import { useEffect, useRef } from "react";
export function useDrag(enabled, open) {
    useEffect(() => {
        if (!enabled || !open)
            return;
        const panelEl = document.getElementById("pc-panel");
        const headerEl = document.getElementById("pc-header");
        if (!panelEl || !headerEl)
            return;
        let sx = 0, sy = 0, x = panelEl.offsetLeft, y = panelEl.offsetTop, dragging = false;
        const md = (e) => {
            dragging = true;
            sx = e.clientX;
            sy = e.clientY;
            e.preventDefault();
        };
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
export function useScrollToBottom() {
    const msgsRef = useRef(null);
    const scrollBottom = (smooth = true) => {
        if (msgsRef.current) {
            msgsRef.current.scrollTo({
                top: msgsRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    };
    return { msgsRef, scrollBottom };
}
