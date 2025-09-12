import React from "react";
import cn from "classnames";

interface TypingIndicatorProps {
  botName: string;
}

export default function TypingIndicator({ botName }: TypingIndicatorProps) {
  return (
    <div className={cn("pc-row", "pc-row-bot")}>
      <div className="pc-name pc-name-bot">{botName}</div>
      <div className="pc-bubble pc-bot">
        <div className="pc-typing">
          <span className="d"></span>
          <span className="d"></span>
          <span className="d"></span>
        </div>
      </div>
    </div>
  );
}
