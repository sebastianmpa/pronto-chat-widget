export function track(event, payload = {}) {
    // GTM compatible
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload, ts: Date.now() });
    // fallback
    if (process.env.NODE_ENV !== "production")
        console.debug("[analytics]", event, payload);
}
