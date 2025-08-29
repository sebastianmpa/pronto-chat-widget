import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export default function OnboardingModal({ lang, onSubmit, onClose }) {
    const [name, setName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [consent, setConsent] = useState(false);
    const [errors, setErrors] = useState({});
    const nameInputRef = useRef(null);
    useEffect(() => {
        var _a;
        (_a = nameInputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    }, []);
    function validate(next) {
        const v = {
            name,
            lastName,
            email,
            consent,
            ...next,
        };
        const e = {};
        if (!v.name.trim())
            e.name = t(lang, "required");
        if (!v.lastName.trim())
            e.lastName = t(lang, "required");
        if (!emailRe.test(v.email.trim()))
            e.email = t(lang, "invalidEmail");
        if (!v.consent)
            e.consent = t(lang, "required");
        setErrors(e);
        return Object.keys(e).length === 0;
    }
    function submit(e) {
        e === null || e === void 0 ? void 0 : e.preventDefault();
        // normalizamos email en minúsculas y trim en todos
        const payload = {
            name: name.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            consent,
        };
        if (!validate(payload))
            return;
        onSubmit(payload);
    }
    return (_jsx("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "pc-onb-title", style: {
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.44)",
            display: "grid",
            placeItems: "center",
            zIndex: 2147483647,
        }, onKeyDown: (ev) => {
            if (ev.key === "Escape")
                onClose === null || onClose === void 0 ? void 0 : onClose();
        }, children: _jsxs("form", { onSubmit: submit, style: {
                background: "#fff",
                width: 360,
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 12px 40px rgba(0,0,0,.4)",
            }, children: [_jsx("h2", { id: "pc-onb-title", style: { margin: "4px 0 12px", font: "600 16px system-ui" }, children: "Pronto Mowers" }), _jsxs("label", { style: { display: "block", marginBottom: 8 }, children: [_jsx("span", { children: t(lang, "name") }), _jsx("input", { ref: nameInputRef, value: name, onChange: (e) => {
                                setName(e.target.value);
                                if (errors.name)
                                    validate({ name: e.target.value });
                            }, style: { width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }, autoComplete: "given-name", "aria-invalid": !!errors.name }), errors.name && _jsx("small", { style: { color: "#d00" }, children: errors.name })] }), _jsxs("label", { style: { display: "block", marginBottom: 8 }, children: [_jsx("span", { children: t(lang, "lastName") }), _jsx("input", { value: lastName, onChange: (e) => {
                                setLastName(e.target.value);
                                if (errors.lastName)
                                    validate({ lastName: e.target.value });
                            }, style: { width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }, autoComplete: "family-name", "aria-invalid": !!errors.lastName }), errors.lastName && _jsx("small", { style: { color: "#d00" }, children: errors.lastName })] }), _jsxs("label", { style: { display: "block", marginBottom: 8 }, children: [_jsx("span", { children: t(lang, "email") }), _jsx("input", { type: "email", value: email, onChange: (e) => {
                                setEmail(e.target.value);
                                if (errors.email)
                                    validate({ email: e.target.value });
                            }, style: { width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }, autoComplete: "email", "aria-invalid": !!errors.email }), errors.email && _jsx("small", { style: { color: "#d00" }, children: errors.email })] }), _jsxs("label", { style: { display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }, children: [_jsx("input", { type: "checkbox", checked: consent, onChange: (e) => {
                                setConsent(e.target.checked);
                                if (errors.consent)
                                    validate({ consent: e.target.checked });
                            }, "aria-invalid": !!errors.consent }), _jsx("span", { children: t(lang, "consent") })] }), errors.consent && _jsx("small", { style: { color: "#d00" }, children: errors.consent }), _jsxs("div", { style: { display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }, children: [_jsx("button", { type: "button", onClick: onClose, className: "pc-action", children: t(lang, "close") }), _jsx("button", { type: "submit", className: "pc-send", children: t(lang, "start") })] })] }) }));
}
