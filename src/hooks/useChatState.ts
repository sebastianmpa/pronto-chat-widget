import { useState, useMemo } from "react";
import { ensureSessionId } from "@/lib/storage";
import type { ChatMessage } from "@/types";

export function useChatState() {
  const sessionId = useMemo(() => ensureSessionId(), []);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);

  const addMessage = (message: ChatMessage) => {
    setMsgs(prev => [...prev, message]);
  };

  const addMessages = (messages: ChatMessage[]) => {
    setMsgs(prev => [...prev, ...messages]);
  };

  const setMessages = (messages: ChatMessage[]) => {
    setMsgs(messages);
  };

  return {
    sessionId,
    msgs,
    typing,
    setTyping,
    addMessage,
    addMessages,
    setMessages,
  };
}
