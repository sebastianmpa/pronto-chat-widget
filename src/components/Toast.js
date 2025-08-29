import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
let pushFn;
export function pushToast(text) {
    pushFn === null || pushFn === void 0 ? void 0 : pushFn({ id: crypto.randomUUID(), text });
}
export default function Toasts() {
    const [list, setList] = useState([]);
    useEffect(() => { pushFn = (t) => { setList(l => [...l, t]); setTimeout(() => setList(l => l.filter(x => x.id !== t.id)), 3000); }; }, []);
    return (_jsx("div", { style: { position: "fixed", right: 20, bottom: 120, display: "grid", gap: 8, zIndex: 2147483647 }, children: list.map(t => (_jsx("div", { style: { background: "#111", color: "#fff", padding: "8px 12px", borderRadius: 10, boxShadow: "0 6px 20px rgba(0,0,0,.3)" }, children: t.text }, t.id))) }));
}
