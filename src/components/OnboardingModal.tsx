import React, { useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
  // ⬇️ incluimos lastName en la firma
  onSubmit: (p: { name: string; lastName: string; email: string; consent: boolean }) => void;
  onClose?: () => void;
};

type FormErrors = {
  name?: string;
  lastName?: string;
  email?: string;
  consent?: string;
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingModal({ lang, onSubmit, onClose }: Props) {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  function validate(next?: Partial<{ name: string; lastName: string; email: string; consent: boolean }>) {
    const v = {
      name,
      lastName,
      email,
      consent,
      ...next,
    };

    const e: FormErrors = {};
    if (!v.name.trim()) e.name = t(lang, "required");
    if (!v.lastName.trim()) e.lastName = t(lang, "required");
    if (!emailRe.test(v.email.trim())) e.email = t(lang, "invalidEmail");
    if (!v.consent) e.consent = t(lang, "required");

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    // normalizamos email en minúsculas y trim en todos
    const payload = {
      name: name.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      consent,
    };
    if (!validate(payload)) return;
    onSubmit(payload);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pc-onb-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.44)",
        display: "grid",
        placeItems: "center",
        zIndex: 2147483647,
      }}
      onKeyDown={(ev) => {
        if (ev.key === "Escape") onClose?.();
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: "#fff",
          width: 360,
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 12px 40px rgba(0,0,0,.4)",
        }}
      >
        <h2 id="pc-onb-title" style={{ margin: "4px 0 12px", font: "600 16px system-ui" }}>
          Pronto Mowers
        </h2>

        <label style={{ display: "block", marginBottom: 8 }}>
          <span>{t(lang, "name")}</span>
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) validate({ name: e.target.value });
            }}
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            autoComplete="given-name"
            aria-invalid={!!errors.name}
          />
          {errors.name && <small style={{ color: "#d00" }}>{errors.name}</small>}
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          <span>{t(lang, "lastName")}</span>
          <input
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              if (errors.lastName) validate({ lastName: e.target.value });
            }}
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            autoComplete="family-name"
            aria-invalid={!!errors.lastName}
          />
          {errors.lastName && <small style={{ color: "#d00" }}>{errors.lastName}</small>}
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          <span>{t(lang, "email")}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) validate({ email: e.target.value });
            }}
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            autoComplete="email"
            aria-invalid={!!errors.email}
          />
          {errors.email && <small style={{ color: "#d00" }}>{errors.email}</small>}
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (errors.consent) validate({ consent: e.target.checked });
            }}
            aria-invalid={!!errors.consent}
          />
          <span>{t(lang, "consent")}</span>
        </label>
        {errors.consent && <small style={{ color: "#d00" }}>{errors.consent}</small>}

        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="pc-action">
            {t(lang, "close")}
          </button>
          <button type="submit" className="pc-send">
            {t(lang, "start")}
          </button>
        </div>
      </form>
    </div>
  );
}
