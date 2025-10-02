import React, { useState } from "react";
import { t, type Lang } from "@/lib/i18n";

interface RatingModalProps {
  lang: Lang;
  onSubmit: (rating: "good" | "neutral" | "bad", comment?: string) => void;
  onClose: () => void;
}

export default function RatingModal({ lang, onSubmit, onClose }: RatingModalProps) {
  const [selectedRating, setSelectedRating] = useState<"good" | "neutral" | "bad" | null>(null);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (selectedRating) {
      onSubmit(selectedRating, comment.trim() || undefined);
    }
  };

  const getRatingEmoji = (rating: "good" | "neutral" | "bad") => {
    switch (rating) {
      case "good": return "😊";
      case "neutral": return "😐";
      case "bad": return "😞";
    }
  };

  return (
    <div className="pc-rating-overlay">
      <div className="pc-rating-modal">
        <div className="pc-rating-header">
          <h3>{t(lang, "rateExperience")}</h3>
          <button className="pc-rating-close" onClick={onClose}>×</button>
        </div>
        
        <div className="pc-rating-content">
          <p>{t(lang, "ratePrompt")}</p>
          
          <div className="pc-rating-options">
            {(["good", "neutral", "bad"] as const).map((rating) => (
              <button
                key={rating}
                className={`pc-rating-option ${selectedRating === rating ? "selected" : ""}`}
                onClick={() => setSelectedRating(rating)}
              >
                <span className="pc-rating-emoji">{getRatingEmoji(rating)}</span>
                <span className="pc-rating-text">{t(lang, rating)}</span>
              </button>
            ))}
          </div>
          
          <textarea
            className="pc-rating-comment"
            placeholder={t(lang, "commentOptional")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          
          <button
            className="pc-rating-submit"
            onClick={handleSubmit}
            disabled={!selectedRating}
          >
            {t(lang, "submitRating")}
          </button>
        </div>
      </div>
    </div>
  );
}
