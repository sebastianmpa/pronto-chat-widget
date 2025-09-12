import React, { useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { storage, setCustomerId } from "@/lib/storage";
import { createCustomer } from "@/lib/api";
import { pushToast } from "./Toast";

interface OnboardingFormData {
  name: string;
  lastName: string;
  email: string;
  consent: boolean;
}

interface OnboardingBubbleProps {
  lang: Lang;
  sessionId: string;
  onSuccess: (customer: any) => void;
  onScrollBottom: () => void;
}

export default function OnboardingBubble({ 
  lang, 
  sessionId, 
  onSuccess, 
  onScrollBottom 
}: OnboardingBubbleProps) {
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

  const handleSubmit = async (formData: OnboardingFormData) => {
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
      } else {
        pushToast(lang === "es" ? "Error en el registro" : "Registration error");
      }
    } catch (error) {
      pushToast(lang === "es" ? "No se pudo registrar" : "Registration failed");
    } finally {
      setTimeout(onScrollBottom, 30);
    }
  };

  return (
    <div className="pc-bubble pc-bot pc-onb-bubble">
      <div className="pc-card pc-onb-card" style={{ 
        width: "100%", 
        maxHeight: "340px", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "center", 
        gap: 10 
      }}>
        <div style={{ color: "#333", marginBottom: 4 }}>
          {lang === "es" ? "Antes de empezar, tus datos:" : "Before we start, your details:"}
        </div>
        
        <input 
          className="pc-field" 
          placeholder={t(lang, "name")}
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          autoComplete="given-name" 
        />
        
        <input 
          className="pc-field" 
          placeholder={t(lang, "lastName")}
          value={lastName} 
          onChange={(e) => setLastName(e.target.value)} 
          autoComplete="family-name" 
        />
        
        <input
          className="pc-field"
          type="email"
          placeholder={t(lang, "email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          style={emailInvalid ? { boxShadow: '0 0 0 2px #ff3b3b' } : {}}
        />
        
        <label style={{ 
          display: "flex", 
          gap: 8, 
          alignItems: "center", 
          font: "13px Inter,system-ui" 
        }}>
          <input 
            type="checkbox" 
            checked={consent} 
            onChange={(e) => setConsent(e.target.checked)} 
          />
          <span>
            {t(lang, "consent")} {" "}
            <a 
              href="https://briggs.lawnmowers.parts/terms-conditions/" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: '#007bff', textDecoration: 'underline' }}
            >
              {lang === "es" ? "Términos y condiciones" : "Terms and conditions"}
            </a>
          </span>
        </label>
        
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <button 
            className="pc-btn-primary" 
            disabled={!valid}
            onClick={() => valid && handleSubmit({
              name: name.trim(),
              lastName: lastName.trim(),
              email: email.trim().toLowerCase(),
              consent
            })}
          >
            {t(lang, "start")}
          </button>
        </div>
      </div>
    </div>
  );
}
