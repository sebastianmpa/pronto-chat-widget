import { useState, useMemo } from "react";
import { ensureSessionId } from "@/lib/storage";
export function useChatState() {
    const sessionId = useMemo(() => ensureSessionId(), []);
    const [msgs, setMsgs] = useState([]);
    const [typing, setTyping] = useState(false);
    const addMessage = (message) => {
        setMsgs(prev => [...prev, message]);
    };
    const addMessages = (messages) => {
        setMsgs(prev => [...prev, ...messages]);
    };
    const setMessages = (messages) => {
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
