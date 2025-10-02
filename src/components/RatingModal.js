import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { t } from "@/lib/i18n";
export default function RatingModal({ lang, onSubmit, onClose }) {
    const [selectedRating, setSelectedRating] = useState(null);
    const [comment, setComment] = useState("");
    const handleSubmit = () => {
        if (selectedRating) {
            onSubmit(selectedRating, comment.trim() || undefined);
        }
    };
    const getRatingEmoji = (rating) => {
        switch (rating) {
            case "good": return "😊";
            case "neutral": return "😐";
            case "bad": return "😞";
        }
    };
    return (_jsx("div", { className: "pc-rating-overlay", children: _jsxs("div", { className: "pc-rating-modal", children: [_jsxs("div", { className: "pc-rating-header", children: [_jsx("h3", { children: t(lang, "rateExperience") }), _jsx("button", { className: "pc-rating-close", onClick: onClose, children: "\u00D7" })] }), _jsxs("div", { className: "pc-rating-content", children: [_jsx("p", { children: t(lang, "ratePrompt") }), _jsx("div", { className: "pc-rating-options", children: ["good", "neutral", "bad"].map((rating) => (_jsxs("button", { className: `pc-rating-option ${selectedRating === rating ? "selected" : ""}`, onClick: () => setSelectedRating(rating), children: [_jsx("span", { className: "pc-rating-emoji", children: getRatingEmoji(rating) }), _jsx("span", { className: "pc-rating-text", children: t(lang, rating) })] }, rating))) }), _jsx("textarea", { className: "pc-rating-comment", placeholder: t(lang, "commentOptional"), value: comment, onChange: (e) => setComment(e.target.value), rows: 3 }), _jsx("button", { className: "pc-rating-submit", onClick: handleSubmit, disabled: !selectedRating, children: t(lang, "submitRating") })] })] }) }));
}
