import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { storage, setCustomerId } from "@/lib/storage";
import { createCustomer } from "@/lib/api";
import { pushToast } from "./Toast";
export default function OnboardingBubble({ lang, sessionId, onSuccess, onScrollBottom }) {
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
    const handleSubmit = async (formData) => {
        const next = { ...storage.read(), ...formData, sessionId, locale: lang };
        storage.write(next);
        try {
            const customer = await createCustomer({
                name: formData.name,
                lastName: formData.lastName,
                email: formData.email
            });
            if (customer.id) {
                setCustomerId(customer.id);
                onSuccess(customer);
            }
            else {
                pushToast(lang === "es" ? "Error en el registro" : "Registration error");
            }
        }
        catch (error) {
            pushToast(lang === "es" ? "No se pudo registrar" : "Registration failed");
        }
        finally {
            setTimeout(onScrollBottom, 30);
        }
    };
    return (_jsx("div", { className: "pc-bubble pc-bot pc-onb-bubble", children: _jsxs("div", { className: "pc-card pc-onb-card", style: {
                width: "100%",
                maxHeight: "340px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 10
            }, children: [_jsx("div", { style: { color: "#333", marginBottom: 4 }, children: lang === "es" ? "Antes de empezar, tus datos:" : "Before we start, your details:" }), _jsx("input", { className: "pc-field", placeholder: t(lang, "name"), value: name, onChange: (e) => setName(e.target.value), autoComplete: "given-name" }), _jsx("input", { className: "pc-field", placeholder: t(lang, "lastName"), value: lastName, onChange: (e) => setLastName(e.target.value), autoComplete: "family-name" }), _jsx("input", { className: "pc-field", type: "email", placeholder: t(lang, "email"), value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email", style: emailInvalid ? { boxShadow: '0 0 0 2px #ff3b3b' } : {} }), _jsxs("label", { style: {
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        font: "13px Inter,system-ui"
                    }, children: [_jsx("input", { type: "checkbox", checked: consent, onChange: (e) => setConsent(e.target.checked) }), _jsxs("span", { children: [t(lang, "consent"), " ", " ", _jsx("a", { href: "https://briggs.lawnmowers.parts/terms-conditions/", target: "_blank", rel: "noopener noreferrer", style: { color: '#007bff', textDecoration: 'underline' }, children: lang === "es" ? "Términos y condiciones" : "Terms and conditions" })] })] }), _jsx("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: 4 }, children: _jsx("button", { className: "pc-btn-primary", disabled: !valid, onClick: () => valid && handleSubmit({
                            name: name.trim(),
                            lastName: lastName.trim(),
                            email: email.trim().toLowerCase(),
                            consent
                        }), children: t(lang, "start") }) })] }) }));
}
