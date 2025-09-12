import React from "react";
import cn from "classnames";
import { renderMarkdown } from "@/utils/markdownRenderer";
import type { ChatMessage } from "@/types";

interface ChatMessageProps {
  message: ChatMessage;
  isUser: boolean;
  userName: string;
  botName: string;
}

export default function ChatMessageComponent({ 
  message, 
  isUser, 
  userName, 
  botName 
}: ChatMessageProps) {
  return (
    <div className={cn("pc-row", isUser ? "pc-row-me" : "pc-row-bot")}>
      <div className={cn("pc-name", isUser ? "pc-name-me" : "pc-name-bot")}>
        {isUser ? userName : botName}
      </div>
      <div className={cn("pc-bubble", isUser ? "pc-me" : "pc-bot")}>
        {renderMarkdown(message.text)}
      </div>
    </div>
  );
}
